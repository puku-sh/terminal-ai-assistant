package apijson

import (
	"bytes"
	"encoding/json"
	"reflect"
	"sort"
	"strconv"
	"time"
)

type Encoder struct {
	dateFormat string
	root       bool
}

func Marshal(value interface{}) ([]byte, error) {
	e := &Encoder{dateFormat: time.RFC3339}
	return e.marshal(value)
}

func MarshalRoot(value interface{}) ([]byte, error) {
	e := &Encoder{dateFormat: time.RFC3339, root: true}
	return e.marshal(value)
}

func (e *Encoder) marshal(value interface{}) ([]byte, error) {
	val := reflect.ValueOf(value)
	if !val.IsValid() {
		return nil, nil
	}
	return e.typeEncoder(val.Type())(val)
}

type encoderFunc func(value reflect.Value) ([]byte, error)

func (e *Encoder) typeEncoder(t reflect.Type) encoderFunc {
	if t.ConvertibleTo(reflect.TypeOf(time.Time{})) {
		return e.newTimeEncoder()
	}

	if !e.root && t.Implements(reflect.TypeOf((*json.Marshaler)(nil)).Elem()) {
		return marshalerEncoder
	}

	if !e.root && reflect.PointerTo(t).Implements(reflect.TypeOf((*json.Marshaler)(nil)).Elem()) {
		return indirectMarshalerEncoder
	}

	e.root = false

	switch t.Kind() {
	case reflect.Pointer:
		return e.newPtrEncoder(t)
	case reflect.Struct:
		return e.newStructEncoder(t)
	case reflect.Slice, reflect.Array:
		return e.newArrayEncoder(t)
	case reflect.Map:
		return e.newMapEncoder(t)
	case reflect.Interface:
		return e.newInterfaceEncoder()
	default:
		return e.newPrimitiveEncoder(t)
	}
}

func marshalerEncoder(value reflect.Value) ([]byte, error) {
	return value.Interface().(json.Marshaler).MarshalJSON()
}

func indirectMarshalerEncoder(value reflect.Value) ([]byte, error) {
	return value.Addr().Interface().(json.Marshaler).MarshalJSON()
}

func (e *Encoder) newPtrEncoder(t reflect.Type) encoderFunc {
	inner := e.typeEncoder(t.Elem())
	return func(value reflect.Value) ([]byte, error) {
		if value.IsNil() {
			return []byte("null"), nil
		}
		return inner(value.Elem())
	}
}

// isParamField checks if a type is a param.Field type
func isParamField(t reflect.Type) bool {
	if t.Kind() != reflect.Struct {
		return false
	}
	// Check if it has Present, Null, Value, and Raw fields which are characteristic of param.Field
	_, hasPresent := t.FieldByName("Present")
	_, hasNull := t.FieldByName("Null")
	_, hasValue := t.FieldByName("Value")
	_, hasRaw := t.FieldByName("Raw")
	return hasPresent && hasNull && hasValue && hasRaw
}

func (e *Encoder) newStructEncoder(t reflect.Type) encoderFunc {
	encoderFields := []struct {
		tag        parsedStructTag
		fn         encoderFunc
		idx        []int
		isParamFld bool
	}{}

	for i := 0; i < t.NumField(); i++ {
		idx := []int{i}
		field := t.FieldByIndex(idx)
		if !field.IsExported() {
			continue
		}
		ptag, ok := parseJSONStructTag(field)
		if !ok || ptag.metadata || ptag.extras {
			continue
		}

		// Check if this field is a param.Field
		isPF := isParamField(field.Type)
		var fn encoderFunc
		if isPF {
			// For param.Field, we encode the Value field's type
			valueField, _ := field.Type.FieldByName("Value")
			fn = e.typeEncoder(valueField.Type)
		} else {
			fn = e.typeEncoder(field.Type)
		}

		encoderFields = append(encoderFields, struct {
			tag        parsedStructTag
			fn         encoderFunc
			idx        []int
			isParamFld bool
		}{ptag, fn, idx, isPF})
	}

	return func(value reflect.Value) ([]byte, error) {
		pairs := [][]byte{}
		for _, ef := range encoderFields {
			fv := value.FieldByIndex(ef.idx)

			// Handle param.Field wrapper
			if ef.isParamFld {
				present := fv.FieldByName("Present")
				if present.IsValid() && !present.Bool() {
					continue
				}
				null := fv.FieldByName("Null")
				if null.IsValid() && null.Bool() {
					key, _ := json.Marshal(ef.tag.name)
					pairs = append(pairs, bytes.Join([][]byte{key, []byte("null")}, []byte(":")))
					continue
				}
				raw := fv.FieldByName("Raw")
				if raw.IsValid() && !raw.IsNil() {
					v, err := json.Marshal(raw.Interface())
					if err != nil {
						return nil, err
					}
					key, _ := json.Marshal(ef.tag.name)
					pairs = append(pairs, bytes.Join([][]byte{key, v}, []byte(":")))
					continue
				}
				fv = fv.FieldByName("Value")
			}

			encoded, err := ef.fn(fv)
			if err != nil {
				return nil, err
			}
			if encoded == nil {
				continue
			}
			key, _ := json.Marshal(ef.tag.name)
			pairs = append(pairs, bytes.Join([][]byte{key, encoded}, []byte(":")))
		}
		return bytes.Join([][]byte{[]byte("{"), bytes.Join(pairs, []byte(",")), []byte("}")}, nil), nil
	}
}

func (e *Encoder) newArrayEncoder(t reflect.Type) encoderFunc {
	itemEncoder := e.typeEncoder(t.Elem())
	return func(value reflect.Value) ([]byte, error) {
		items := [][]byte{}
		for i := 0; i < value.Len(); i++ {
			encoded, err := itemEncoder(value.Index(i))
			if err != nil {
				return nil, err
			}
			items = append(items, encoded)
		}
		return bytes.Join([][]byte{[]byte("["), bytes.Join(items, []byte(",")), []byte("]")}, nil), nil
	}
}

func (e *Encoder) newMapEncoder(t reflect.Type) encoderFunc {
	itemEncoder := e.typeEncoder(t.Elem())
	return func(value reflect.Value) ([]byte, error) {
		pairs := [][]byte{}
		keys := value.MapKeys()
		sort.Slice(keys, func(i, j int) bool {
			return keys[i].String() < keys[j].String()
		})
		for _, key := range keys {
			encoded, err := itemEncoder(value.MapIndex(key))
			if err != nil {
				return nil, err
			}
			keyBytes, _ := json.Marshal(key.Interface())
			pairs = append(pairs, bytes.Join([][]byte{keyBytes, encoded}, []byte(":")))
		}
		return bytes.Join([][]byte{[]byte("{"), bytes.Join(pairs, []byte(",")), []byte("}")}, nil), nil
	}
}

func (e *Encoder) newInterfaceEncoder() encoderFunc {
	return func(value reflect.Value) ([]byte, error) {
		if value.IsNil() {
			return []byte("null"), nil
		}
		return e.typeEncoder(value.Elem().Type())(value.Elem())
	}
}

func (e *Encoder) newPrimitiveEncoder(t reflect.Type) encoderFunc {
	switch t.Kind() {
	case reflect.String:
		return func(value reflect.Value) ([]byte, error) {
			return json.Marshal(value.String())
		}
	case reflect.Bool:
		return func(value reflect.Value) ([]byte, error) {
			if value.Bool() {
				return []byte("true"), nil
			}
			return []byte("false"), nil
		}
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return func(value reflect.Value) ([]byte, error) {
			return []byte(strconv.FormatInt(value.Int(), 10)), nil
		}
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return func(value reflect.Value) ([]byte, error) {
			return []byte(strconv.FormatUint(value.Uint(), 10)), nil
		}
	case reflect.Float32, reflect.Float64:
		return func(value reflect.Value) ([]byte, error) {
			return []byte(strconv.FormatFloat(value.Float(), 'f', -1, 64)), nil
		}
	default:
		return func(value reflect.Value) ([]byte, error) {
			return json.Marshal(value.Interface())
		}
	}
}

func (e *Encoder) newTimeEncoder() encoderFunc {
	format := e.dateFormat
	return func(value reflect.Value) ([]byte, error) {
		t := value.Convert(reflect.TypeOf(time.Time{})).Interface().(time.Time)
		return json.Marshal(t.Format(format))
	}
}
