# Union Types and AsUnion() Pattern in PukuCode

## Table of Contents

1. [Introduction](#introduction)
2. [What Are Union Types?](#what-are-union-types)
3. [TypeScript Unions vs Go "Unions"](#typescript-unions-vs-go-unions)
4. [The AsUnion() Pattern](#the-asunion-pattern)
5. [Real Examples from PukuCode](#real-examples-from-pukucode)
6. [Advanced Patterns](#advanced-patterns)
7. [Best Practices](#best-practices)
8. [Common Pitfalls](#common-pitfalls)

---

## Introduction

The PukuCode codebase extensively uses **union types** to model data that can take multiple forms. This pattern is elegant in TypeScript but requires special handling in Go. This document explains:

- Why unions are necessary
- How they're implemented in TypeScript (backend) vs Go (SDK/TUI)
- The `AsUnion()` method pattern
- How to work with unions effectively

---

## What Are Union Types?

### Conceptual Definition

A **union type** represents a value that can be one of several different types. Think of it as "this OR that OR another thing."

### Real-World Analogy

Consider a `Vehicle` that can be a `Car`, `Truck`, or `Motorcycle`:

```
Vehicle = Car | Truck | Motorcycle
```

When you receive a `Vehicle`, you need to:
1. **Determine which specific type it is**
2. **Access type-specific fields** (e.g., `Truck.cargoCapacity`)

### Why Unions Are Needed in PukuCode

PukuCode has several entities that can have multiple forms:

1. **Messages**: Can be `UserMessage` or `AssistantMessage`
2. **Message Parts**: Can be `TextPart`, `ToolUsePart`, `ToolResultPart`, `ReasoningPart`, etc.
3. **Events**: Can be `SessionUpdated`, `MessageUpdated`, `PartUpdated`, etc.

Each type shares common fields but has type-specific fields:

```typescript
// UserMessage has:
{ id, sessionID, role: "user", time: { created } }

// AssistantMessage has:
{ id, sessionID, role: "assistant", modelID, tokens, cost, error, ... }
```

---

## TypeScript Unions vs Go "Unions"

### TypeScript: Native Union Support

TypeScript has **first-class union types**:

```typescript
// Define a discriminated union
type Message =
  | { role: "user"; id: string; time: { created: number } }
  | { role: "assistant"; id: string; modelID: string; cost: number }

// Type-safe narrowing
function processMessage(msg: Message) {
  if (msg.role === "user") {
    // TypeScript knows: msg.time.created exists
    console.log(msg.time.created)
  } else {
    // TypeScript knows: msg.modelID and msg.cost exist
    console.log(msg.modelID, msg.cost)
  }
}
```

**Key features**:
- ✅ Type narrowing based on discriminant field (`role`)
- ✅ Exhaustiveness checking (compiler ensures all cases handled)
- ✅ Automatic type inference

### Go: No Native Unions

Go does **not** have union types. Instead, we use:

1. **Interfaces** (but lose type information)
2. **Type switches** (manual type checking)
3. **Wrapper structs** (what PukuCode uses)

#### The PukuCode Approach: Discriminated Wrapper

```go
// Define separate concrete types
type UserMessage struct {
    ID        string
    SessionID string
    Role      string  // "user"
    Time      UserMessageTime
}

type AssistantMessage struct {
    ID        string
    SessionID string
    Role      string  // "assistant"
    ModelID   string
    Cost      float64
    Tokens    AssistantMessageTokens
}

// Define a union interface
type MessageUnion interface {
    implementsMessageUnion()  // Marker method
}

// Implement marker on both types
func (UserMessage) implementsMessageUnion() {}
func (AssistantMessage) implementsMessageUnion() {}

// Use type switches to narrow
func processMessage(msg MessageUnion) {
    switch m := msg.(type) {
    case UserMessage:
        fmt.Println(m.Time.Created)
    case AssistantMessage:
        fmt.Println(m.ModelID, m.Cost)
    }
}
```

**Differences from TypeScript**:
- ❌ No automatic narrowing
- ❌ No exhaustiveness checking (missing case = silent bug)
- ✅ Explicit type assertion required
- ✅ Runtime type information preserved

---

## The AsUnion() Pattern

### What Is AsUnion()?

`AsUnion()` is a method that **converts a generic/wrapper type into a specific concrete type**. It's PukuCode's way of bridging the TypeScript-Go union gap.

### Pattern Structure

```go
// 1. Generic/Wrapper struct (from JSON)
type EventMessage struct {
    ID        string  `json:"id"`
    SessionID string  `json:"sessionID"`
    Role      string  `json:"role"`
    ModelID   string  `json:"modelID,omitempty"`
    Cost      float64 `json:"cost,omitempty"`
    // ... all possible fields from all message types
}

// 2. Specific concrete types
type UserMessage struct {
    ID        string
    SessionID string
    Role      UserMessageRole  // type-safe enum
    Time      UserMessageTime
}

type AssistantMessage struct {
    ID        string
    SessionID string
    Role      string
    ModelID   string
    Cost      float64
    // ... assistant-specific fields
}

// 3. Union interface
type MessageUnion interface {
    implementsMessageUnion()
}

// 4. AsUnion() method - the converter
func (r *EventMessage) AsUnion() MessageUnion {
    if r.Role == "user" {
        return UserMessage{
            ID:        r.ID,
            SessionID: r.SessionID,
            Role:      UserMessageRoleUser,
            Time:      UserMessageTime{Created: r.Time.Created},
        }
    }
    return AssistantMessage{
        ID:        r.ID,
        SessionID: r.SessionID,
        Role:      r.Role,
        ModelID:   r.ModelID,
        Cost:      r.Cost,
        // ...
    }
}
```

### Why This Pattern?

1. **JSON Unmarshaling**: Go's `encoding/json` needs concrete struct types
   - Can't unmarshal directly into `interface{}`
   - Can't unmarshal into union types (they don't exist)

2. **Type Safety**: Once converted, can use type switches safely
   ```go
   msg := eventMsg.AsUnion()
   switch m := msg.(type) {
   case UserMessage:
       // m is typed as UserMessage
   case AssistantMessage:
       // m is typed as AssistantMessage
   }
   ```

3. **Field Validation**: Can enforce type-specific constraints
   ```go
   // AssistantMessage MUST have ModelID
   // UserMessage doesn't need it
   ```

---

## Real Examples from PukuCode

### Example 1: Event Type Conversion

**File**: `packages/sdk/go/event.go`

```go
// Generic Event received from SSE
type Event struct {
    Type       string          `json:"type"`
    Properties EventProperties `json:"properties"`
}

// Specific event type aliases
type EventListResponseEventSessionUpdated Event
type EventListResponseEventMessageUpdated Event
type EventListResponseEventMessagePartUpdated Event

// AsUnion() converts generic Event to specific type
func (e *Event) AsUnion() interface{} {
    switch e.Type {
    case "session.updated":
        return EventListResponseEventSessionUpdated(*e)
    case "message.updated":
        return EventListResponseEventMessageUpdated(*e)
    case "message.part.updated":
        return EventListResponseEventMessagePartUpdated(*e)
    case "permission.updated":
        return EventListResponseEventPermissionUpdated(*e)
    // ... more cases
    default:
        return *e  // Fallback to generic Event
    }
}
```

**Usage**:

```go
// packages/tui/cmd/pukucode/main.go
for stream.Next() {
    evt := stream.Current()  // Returns Event

    // Convert to specific type for type switch
    program.Send(evt.AsUnion())
}

// packages/tui/internal/tui/tui.go
func (a Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case EventListResponseEventMessageUpdated:  // ← Specific type matches!
        // Handle message update
    case EventListResponseEventMessagePartUpdated:
        // Handle part update
    }
}
```

**Why necessary**: Go's type switch requires **exact type matches**. Even though `EventListResponseEventMessageUpdated` is just `type EventListResponseEventMessageUpdated Event`, they're distinct types for type switching.

### Example 2: Message Type Conversion

**File**: `packages/sdk/go/event.go`

```go
// EventMessage represents a message in SSE events
type EventMessage struct {
    ID        string                `json:"id"`
    SessionID string                `json:"sessionID"`
    Role      string                `json:"role"`
    Mode      string                `json:"mode,omitempty"`
    ModelID   string                `json:"modelID,omitempty"`
    Time      MessageTime           `json:"time,omitempty"`
    Error     AssistantMessageError `json:"error,omitempty"`
    Cost      float64               `json:"cost,omitempty"`
    Tokens    AssistantMessageTokens `json:"tokens,omitempty"`
}

// AsUnion returns the EventMessage as a typed message based on Role field
func (r *EventMessage) AsUnion() MessageUnion {
    if r.Role == "user" {
        return UserMessage{
            ID:        r.ID,
            SessionID: r.SessionID,
            Role:      UserMessageRoleUser,
            Time:      UserMessageTime{Created: r.Time.Created},
        }
    }
    return AssistantMessage{
        ID:        r.ID,
        SessionID: r.SessionID,
        Role:      r.Role,
        Mode:      r.Mode,
        ModelID:   r.ModelID,
        Time:      r.Time,
        Error:     r.Error,
        Cost:      r.Cost,
        Tokens:    r.Tokens,
    }
}
```

**Usage in TUI**:

```go
// packages/tui/internal/tui/tui.go
case pukucode.EventListResponseEventMessageUpdated:
    if msg.Properties.Message != nil {
        // Convert to typed union
        messageUnion := msg.Properties.Message.AsUnion()

        // Store in app state
        a.app.Messages[i] = app.Message{
            Info:  messageUnion,  // MessageUnion type
            Parts: []pukucode.PartUnion{},
        }
    }
```

**Later retrieval**:

```go
// packages/tui/internal/components/chat/messages.go
for _, message := range m.app.Messages {
    switch casted := message.Info.(type) {
    case pukucode.UserMessage:
        // Render user message
        content = renderUserMessage(casted.ID, parts)

    case pukucode.AssistantMessage:
        // Render assistant message with model info
        content = renderAssistantMessage(casted.ModelID, casted.Cost, parts)
    }
}
```

### Example 3: Message Part Conversion

**File**: `packages/sdk/go/part.go`

Message parts have the most complex union - 10+ different types!

```go
// Generic Part from JSON
type Part struct {
    ID        string      `json:"id"`
    MessageID string      `json:"messageID"`
    SessionID string      `json:"sessionID"`
    Type      PartType    `json:"type"`  // Discriminant
    // ... all possible fields from all part types
    Text      string      `json:"text,omitempty"`
    Name      string      `json:"name,omitempty"`
    Input     interface{} `json:"input,omitempty"`
    Output    string      `json:"output,omitempty"`
    // ... many more fields
}

// AsUnion returns the Part as the appropriate typed part
func (p *Part) AsUnion() PartUnion {
    switch p.Type {
    case PartTypeText:
        return PartText{
            ID:        p.ID,
            MessageID: p.MessageID,
            Type:      PartTypeText,
            Text:      p.Text,
        }
    case PartTypeToolUse:
        return PartToolUse{
            ID:        p.ID,
            MessageID: p.MessageID,
            Type:      PartTypeToolUse,
            Name:      p.Name,
            Input:     p.Input,
        }
    case PartTypeToolResult:
        return PartToolResult{
            ID:        p.ID,
            MessageID: p.MessageID,
            Type:      PartTypeToolResult,
            ToolUseID: p.ToolUseID,
            Output:    p.Output,
            IsError:   p.IsError,
        }
    case PartTypeReasoning:
        return PartReasoning{
            ID:        p.ID,
            MessageID: p.MessageID,
            Type:      PartTypeReasoning,
            Reasoning: p.Reasoning,
        }
    // ... 6 more part types
    }
}
```

**Usage - Rendering different part types**:

```go
// packages/tui/internal/components/chat/messages.go
for _, part := range message.Parts {
    switch p := part.(type) {
    case pukucode.PartText:
        // Render plain text
        content.WriteString(p.Text)

    case pukucode.PartReasoning:
        // Render with purple background
        content.WriteString(reasoningStyle.Render(p.Reasoning))

    case pukucode.PartToolUse:
        // Render collapsible tool section
        content.WriteString(renderToolUse(p.Name, p.Input))

    case pukucode.PartToolResult:
        // Render tool output
        content.WriteString(renderToolResult(p.Output, p.IsError))
    }
}
```

**Why so many part types?**

Each part type has unique fields:
- `PartText`: Just text content
- `PartReasoning`: Extended thinking
- `PartToolUse`: Tool name + input parameters
- `PartToolResult`: Tool output + error flag
- `PartStepStart`: Step metadata
- `PartStepEnd`: Duration info
- ... and more

### Example 4: Custom EventProperties Unmarshaling

**File**: `packages/sdk/go/event.go` (from our bug fix)

This is the most complex AsUnion-like pattern - **dynamic type detection during JSON unmarshaling**.

```go
type EventProperties struct {
    Info    *Session      `json:"-"`  // Not directly unmarshaled
    Message *EventMessage `json:"-"`  // Not directly unmarshaled
    Part    *EventMessagePart `json:"part,omitempty"`
    // ... other fields
}

// Custom unmarshaler handles "info" field ambiguity
func (p *EventProperties) UnmarshalJSON(data []byte) error {
    // Unmarshal into temp struct to capture raw "info" field
    type Alias EventProperties
    aux := &struct {
        InfoRaw json.RawMessage `json:"info,omitempty"`
        *Alias
    }{
        Alias: (*Alias)(p),
    }

    if err := json.Unmarshal(data, &aux); err != nil {
        return err
    }

    // Dynamically determine type of "info" field
    if len(aux.InfoRaw) > 0 {
        var check map[string]interface{}
        if err := json.Unmarshal(aux.InfoRaw, &check); err == nil {
            if _, hasRole := check["role"]; hasRole {
                // Has "role" field → it's a message
                var msg EventMessage
                if err := json.Unmarshal(aux.InfoRaw, &msg); err == nil {
                    p.Message = &msg
                }
            } else {
                // No "role" field → it's a session
                var sess Session
                if err := json.Unmarshal(aux.InfoRaw, &sess); err == nil {
                    p.Info = &sess
                }
            }
        }
    }

    return nil
}
```

**This is like AsUnion() but embedded in the unmarshaling process itself!**

Flow:
```
JSON arrives: {"type": "message.updated", "properties": {"info": {"role": "assistant", ...}}}
    ↓
UnmarshalJSON captures raw "info" field
    ↓
Checks for "role" field
    ↓
Detects it's a message
    ↓
Unmarshals into EventMessage
    ↓
Stores in p.Message
    ↓
Result: msg.Properties.Message is populated correctly
```

---

## Advanced Patterns

### Pattern 1: Nested Unions

Sometimes unions contain unions:

```go
type Message struct {
    Info  MessageUnion    // Can be UserMessage or AssistantMessage
    Parts []PartUnion     // Each part can be Text, ToolUse, ToolResult, etc.
}
```

**Usage**:

```go
// Double type switch
for _, msg := range messages {
    switch m := msg.Info.(type) {
    case AssistantMessage:
        for _, part := range msg.Parts {
            switch p := part.(type) {
            case PartToolUse:
                fmt.Printf("AI used tool: %s\n", p.Name)
            case PartText:
                fmt.Printf("AI responded: %s\n", p.Text)
            }
        }
    }
}
```

### Pattern 2: Generic AsUnion with Type Parameters (Go 1.18+)

While PukuCode doesn't use this (for Go 1.17 compatibility), modern Go can use generics:

```go
type Unionable[T any] interface {
    AsUnion() T
}

func Convert[T any, U Unionable[T]](generic U) T {
    return generic.AsUnion()
}
```

### Pattern 3: Interface Embedding for Shared Behavior

```go
// All messages have common methods
type Message interface {
    GetID() string
    GetSessionID() string
}

// Specific message types
type UserMessage struct { ... }
type AssistantMessage struct { ... }

// Implement interface on both
func (u UserMessage) GetID() string { return u.ID }
func (u UserMessage) GetSessionID() string { return u.SessionID }

func (a AssistantMessage) GetID() string { return a.ID }
func (a AssistantMessage) GetSessionID() string { return a.SessionID }

// Now can use polymorphically
func findMessage(messages []Message, id string) Message {
    for _, msg := range messages {
        if msg.GetID() == id {  // Works for both types!
            return msg
        }
    }
    return nil
}
```

**PukuCode uses this pattern in**:

```go
// packages/tui/internal/tui/tui.go
matchIndex := slices.IndexFunc(a.app.Messages, func(m app.Message) bool {
    switch casted := m.Info.(type) {
    case pukucode.UserMessage:
        return casted.ID == msg.Properties.Message.ID
    case pukucode.AssistantMessage:
        return casted.ID == msg.Properties.Message.ID
    }
    return false
})
```

**Could be simplified to** (if Message interface existed):

```go
matchIndex := slices.IndexFunc(a.app.Messages, func(m app.Message) bool {
    return m.Info.GetID() == msg.Properties.Message.ID
})
```

### Pattern 4: Union Validation

AsUnion() can enforce business rules:

```go
func (r *EventMessage) AsUnion() (MessageUnion, error) {
    if r.Role == "user" {
        // User messages must have created timestamp
        if r.Time.Created == 0 {
            return nil, errors.New("user message missing created time")
        }
        return UserMessage{...}, nil
    }

    // Assistant messages must have model ID
    if r.ModelID == "" {
        return nil, errors.New("assistant message missing model ID")
    }
    return AssistantMessage{...}, nil
}
```

---

## Best Practices

### 1. Always Use Discriminant Fields

Ensure union types have a field that distinguishes them:

```go
type Part struct {
    Type PartType `json:"type"`  // ← Discriminant
    // ...
}

func (p *Part) AsUnion() PartUnion {
    switch p.Type {  // ← Switch on discriminant
    case PartTypeText:
        return PartText{...}
    case PartTypeToolUse:
        return PartToolUse{...}
    }
}
```

**Common discriminants**:
- `type` field for parts
- `role` field for messages
- `type` field for events

### 2. Handle Unknown Types Gracefully

```go
func (p *Part) AsUnion() PartUnion {
    switch p.Type {
    case PartTypeText:
        return PartText{...}
    // ... known types
    default:
        // Don't panic! Return a safe default or generic type
        slog.Warn("unknown part type", "type", p.Type)
        return PartText{
            ID:   p.ID,
            Text: fmt.Sprintf("[Unknown part type: %s]", p.Type),
        }
    }
}
```

### 3. Use Type Switches, Not Type Assertions

**Bad** (panics if wrong type):

```go
userMsg := msg.(UserMessage)  // Panics if msg is not UserMessage!
fmt.Println(userMsg.Time.Created)
```

**Good** (safe):

```go
switch m := msg.(type) {
case UserMessage:
    fmt.Println(m.Time.Created)
case AssistantMessage:
    fmt.Println(m.ModelID)
default:
    fmt.Println("unknown message type")
}
```

**Also good** (comma-ok idiom):

```go
if userMsg, ok := msg.(UserMessage); ok {
    fmt.Println(userMsg.Time.Created)
}
```

### 4. Document Union Types Clearly

```go
// MessageUnion represents a message in a session.
// It can be one of:
//   - UserMessage: A message from the user
//   - AssistantMessage: A response from the AI assistant
//
// Use type switches to determine the specific type:
//
//   switch m := msg.(type) {
//   case UserMessage:
//       // Handle user message
//   case AssistantMessage:
//       // Handle assistant message
//   }
type MessageUnion interface {
    implementsMessageUnion()
}
```

### 5. Keep AsUnion() Methods Simple

AsUnion() should be a pure converter - no side effects!

**Bad**:

```go
func (p *Part) AsUnion() PartUnion {
    // Don't do I/O, logging, or state changes!
    db.Save(p)  // ❌
    log.Printf("Converting part %s", p.ID)  // ❌
    // ...
}
```

**Good**:

```go
func (p *Part) AsUnion() PartUnion {
    // Pure conversion logic only
    switch p.Type {
    case PartTypeText:
        return PartText{...}
    }
}
```

### 6. Prefer Specific Types Over Interfaces

When storing in structs, prefer concrete types when possible:

**Less type-safe**:

```go
type Message struct {
    Info MessageUnion  // Could be either type, need type switch every time
}
```

**More type-safe** (when you know the type):

```go
type UserMessageContainer struct {
    Info UserMessage  // Always a user message
}

type AssistantMessageContainer struct {
    Info AssistantMessage  // Always an assistant message
}
```

---

## Common Pitfalls

### Pitfall 1: Forgetting to Call AsUnion()

**Problem**:

```go
// event.Message is *EventMessage (generic wrapper)
// Trying to use it directly fails!
a.app.Messages = append(a.app.Messages, app.Message{
    Info: event.Message,  // ❌ Wrong type!
})
```

**Fix**:

```go
a.app.Messages = append(a.app.Messages, app.Message{
    Info: event.Message.AsUnion(),  // ✅ Converted to MessageUnion
})
```

### Pitfall 2: Type Assertion Without Checking

**Problem**:

```go
userMsg := msg.(UserMessage)  // Panics if msg is AssistantMessage!
```

**Fix**:

```go
if userMsg, ok := msg.(UserMessage); ok {
    // Safe to use userMsg
} else {
    // Handle case where msg is not UserMessage
}
```

### Pitfall 3: Incomplete Type Switches

**Problem**:

```go
switch p := part.(type) {
case PartText:
    render(p.Text)
case PartToolUse:
    render(p.Name)
// Missing cases: PartReasoning, PartToolResult, etc.
// These parts will be silently ignored!
}
```

**Fix** (add default case):

```go
switch p := part.(type) {
case PartText:
    render(p.Text)
case PartToolUse:
    render(p.Name)
default:
    slog.Warn("unhandled part type", "type", fmt.Sprintf("%T", p))
    render(fmt.Sprintf("[Unsupported part: %T]", p))
}
```

### Pitfall 4: Modifying Original After AsUnion()

**Problem**:

```go
msg := eventMsg.AsUnion()
eventMsg.Cost = 0.5  // Modifying original
// msg.Cost is NOT updated! AsUnion() returned a copy
```

**Why**: AsUnion() returns a **value** (copy), not a pointer (reference).

**Fix**: Only work with the union result, don't modify originals after conversion.

### Pitfall 5: Nil Interface Values

**Problem**:

```go
var msg MessageUnion = nil
if msg != nil {
    // This check passes even though msg is nil!
    // Because msg is a nil interface, not a nil pointer
}
```

**Explanation**: In Go, an interface value is nil only if both its type and value are nil.

**Fix**:

```go
var msg MessageUnion = nil
if msg != nil && !reflect.ValueOf(msg).IsNil() {
    // Proper nil check
}
```

Or better, avoid nil interfaces entirely:

```go
// Return pointer to interface, or use error handling
func getMessage() (*MessageUnion, error) {
    // ...
}
```

### Pitfall 6: Comparing Union Values Directly

**Problem**:

```go
msg1 := event1.Message.AsUnion()
msg2 := event2.Message.AsUnion()

if msg1 == msg2 {  // ❌ Comparing interfaces directly
    // This compares interface values, not underlying data!
}
```

**Fix**:

```go
// Compare IDs instead
switch m1 := msg1.(type) {
case UserMessage:
    if m2, ok := msg2.(UserMessage); ok && m1.ID == m2.ID {
        // Same user message
    }
case AssistantMessage:
    if m2, ok := msg2.(AssistantMessage); ok && m1.ID == m2.ID {
        // Same assistant message
    }
}
```

---

## Performance Considerations

### Memory Allocation

AsUnion() creates **new instances**, not references:

```go
func (p *Part) AsUnion() PartUnion {
    return PartText{  // ← New allocation
        ID:   p.ID,
        Text: p.Text,
    }
}
```

**Impact**: For high-frequency operations (like streaming 1000s of parts), this can add GC pressure.

**Optimization** (if needed):

```go
// Return pointers to reduce copying
func (p *Part) AsUnionPtr() *PartUnion {
    var result PartUnion
    switch p.Type {
    case PartTypeText:
        result = &PartText{...}  // Pointer allocation
    }
    return &result
}
```

### Type Switch Performance

Type switches are **very fast** (compiled to hash table lookups), but still have cost.

**Benchmarks** (approximate):
- Type switch: ~3ns per case
- Interface method call: ~5ns
- Type assertion (comma-ok): ~4ns

**Takeaway**: Don't optimize prematurely - type switches are fast enough for most use cases.

---

## Comparison with Other Languages

### Rust: Enums with Data

Rust's enums are closest to what we want:

```rust
enum Message {
    User { id: String, time: u64 },
    Assistant { id: String, model_id: String, cost: f64 },
}

fn process(msg: Message) {
    match msg {
        Message::User { id, time } => println!("{} at {}", id, time),
        Message::Assistant { id, model_id, cost } => println!("{}: {}, ${}", id, model_id, cost),
    }
}
```

**Advantages over Go**:
- ✅ Exhaustiveness checking (compiler error if case missing)
- ✅ Direct pattern matching
- ✅ No AsUnion() needed

### TypeScript: Discriminated Unions

TypeScript has great union support:

```typescript
type Message =
  | { role: "user"; id: string; time: number }
  | { role: "assistant"; id: string; modelID: string; cost: number }

function process(msg: Message) {
    if (msg.role === "user") {
        console.log(msg.time)  // TypeScript knows msg.time exists
    } else {
        console.log(msg.cost)  // TypeScript knows msg.cost exists
    }
}
```

**Advantages over Go**:
- ✅ Automatic type narrowing
- ✅ Exhaustiveness checking with `never` type
- ✅ No conversion methods needed

### Java: Sealed Classes + Pattern Matching (Java 17+)

Modern Java now has pattern matching:

```java
sealed interface Message permits UserMessage, AssistantMessage {}

record UserMessage(String id, long time) implements Message {}
record AssistantMessage(String id, String modelID, double cost) implements Message {}

void process(Message msg) {
    switch (msg) {
        case UserMessage(var id, var time) -> System.out.println(time);
        case AssistantMessage(var id, var modelID, var cost) -> System.out.println(cost);
    }
}
```

**Advantages over Go**:
- ✅ Sealed types (compiler knows all subtypes)
- ✅ Pattern matching in switch
- ✅ Exhaustiveness checking

### Go's Position

Go intentionally avoids complex type systems in favor of **simplicity and explicitness**:

- ❌ No discriminated unions
- ❌ No pattern matching
- ❌ No exhaustiveness checking
- ✅ Simple, explicit type switches
- ✅ Clear, readable code (once you understand the pattern)

---

## Conclusion

The Union/AsUnion pattern is PukuCode's solution to modeling polymorphic data in Go's type system:

1. **TypeScript backend** uses native discriminated unions
2. **Go SDK** uses wrapper structs + AsUnion() conversion methods
3. **Go TUI** uses type switches to handle different union variants

While more verbose than TypeScript/Rust/Java solutions, the pattern is:
- ✅ Explicit and predictable
- ✅ Type-safe (at runtime)
- ✅ Compatible with Go's JSON unmarshaling
- ✅ Easy to understand once you know the pattern

**Key Takeaways**:
- Always call `AsUnion()` when converting generic types to specific types
- Use type switches, not type assertions
- Add default cases to handle unknown types
- Document union types clearly
- Keep AsUnion() methods pure and simple

By following these patterns and best practices, you can effectively work with union types in the PukuCode codebase!

---

## Quick Reference

### Converting Events

```go
evt := stream.Current()           // Event (generic)
typedEvt := evt.AsUnion()         // EventListResponseEvent* (specific)
program.Send(typedEvt)            // Send to type switch
```

### Converting Messages

```go
eventMsg := msg.Properties.Message  // *EventMessage (generic)
msgUnion := eventMsg.AsUnion()      // MessageUnion (specific)
// Type switch:
switch m := msgUnion.(type) {
case UserMessage:    // ...
case AssistantMessage: // ...
}
```

### Converting Parts

```go
eventPart := msg.Properties.Part  // *EventMessagePart (generic)
partUnion := eventPart.AsUnion()  // PartUnion (specific)
// Type switch:
switch p := partUnion.(type) {
case PartText:       // ...
case PartToolUse:    // ...
case PartToolResult: // ...
}
```

### Type Switch Template

```go
switch value := unionValue.(type) {
case ConcreteType1:
    // value is ConcreteType1
case ConcreteType2:
    // value is ConcreteType2
default:
    // Unknown type
    slog.Warn("unknown type", "type", fmt.Sprintf("%T", value))
}
```
