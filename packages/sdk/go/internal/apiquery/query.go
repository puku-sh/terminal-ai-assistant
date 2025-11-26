package apiquery

import (
	"fmt"
	"net/url"
	"reflect"
	"strings"
	"time"
)

func MarshalWithSettings(value interface{}, settings QuerySettings) url.Values {
	e := encoder{time.RFC3339, true, settings}
	kv := url.Values{}
	val := reflect.ValueOf(value)
	if !val.IsValid() {
		return nil
	}
	typ := val.Type()
	for _, pair := range e.typeEncoder(typ)("", val) {
		kv.Add(pair.key, pair.value)
	}
	return kv
}

func Marshal(value interface{}) url.Values {
	return MarshalWithSettings(value, QuerySettings{})
}

type Queryer interface {
	URLQuery() url.Values
}

type QuerySettings struct {
	NestedFormat NestedQueryFormat
	ArrayFormat  ArrayQueryFormat
}

type NestedQueryFormat int

const (
	NestedQueryFormatBrackets NestedQueryFormat = iota
	NestedQueryFormatDots
)

type ArrayQueryFormat int

const (
	ArrayQueryFormatComma ArrayQueryFormat = iota
	ArrayQueryFormatRepeat
	ArrayQueryFormatIndices
	ArrayQueryFormatBrackets
)

type encoder struct {
	dateFormat string
	root       bool
	settings   QuerySettings
}

type pair struct {
	key   string
	value string
}

type encoderFunc func(key string, value reflect.Value) []pair

func (e *encoder) typeEncoder(t reflect.Type) encoderFunc {
	if t.ConvertibleTo(reflect.TypeOf(time.Time{})) {
		return e.newTimeEncoder()
	}

	switch t.Kind() {
	case reflect.Pointer:
		return e.newPtrEncoder(t)
	case reflect.Struct:
		return e.newStructEncoder(t)
	case reflect.Slice, reflect.Array:
		return e.newArrayEncoder(t)
	case reflect.Map:
		return e.newMapEncoder(t)
	default:
		return e.newPrimitiveEncoder()
	}
}

func (e *encoder) newPtrEncoder(t reflect.Type) encoderFunc {
	inner := e.typeEncoder(t.Elem())
	return func(key string, value reflect.Value) []pair {
		if value.IsNil() {
			return nil
		}
		return inner(key, value.Elem())
	}
}

// isParamField checks if a type is a param.Field type
func isParamField(t reflect.Type) bool {
	if t.Kind() != reflect.Struct {
		return false
	}
	_, hasPresent := t.FieldByName("Present")
	_, hasNull := t.FieldByName("Null")
	_, hasValue := t.FieldByName("Value")
	_, hasRaw := t.FieldByName("Raw")
	return hasPresent && hasNull && hasValue && hasRaw
}

func (e *encoder) newStructEncoder(t reflect.Type) encoderFunc {
	encoderFields := []struct {
		name       string
		fn         encoderFunc
		idx        []int
		isParamFld bool
	}{}

	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)
		if !field.IsExported() {
			continue
		}
		tag := field.Tag.Get("query")
		if tag == "" {
			tag = field.Tag.Get("json")
		}
		if tag == "" || tag == "-" {
			continue
		}
		name := strings.Split(tag, ",")[0]

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
			name       string
			fn         encoderFunc
			idx        []int
			isParamFld bool
		}{name, fn, []int{i}, isPF})
	}

	return func(key string, value reflect.Value) []pair {
		pairs := []pair{}
		for _, ef := range encoderFields {
			fv := value.FieldByIndex(ef.idx)

			// Handle param.Field wrapper
			if ef.isParamFld {
				present := fv.FieldByName("Present")
				if present.IsValid() && !present.Bool() {
					continue
				}
				fv = fv.FieldByName("Value")
			}

			fieldKey := ef.name
			if key != "" {
				if e.settings.NestedFormat == NestedQueryFormatDots {
					fieldKey = key + "." + ef.name
				} else {
					fieldKey = key + "[" + ef.name + "]"
				}
			}
			pairs = append(pairs, ef.fn(fieldKey, fv)...)
		}
		return pairs
	}
}

func (e *encoder) newArrayEncoder(t reflect.Type) encoderFunc {
	itemEncoder := e.typeEncoder(t.Elem())
	return func(key string, value reflect.Value) []pair {
		if e.settings.ArrayFormat == ArrayQueryFormatComma {
			// Comma-separated
			values := []string{}
			for i := 0; i < value.Len(); i++ {
				for _, p := range itemEncoder("", value.Index(i)) {
					values = append(values, p.value)
				}
			}
			if len(values) == 0 {
				return nil
			}
			return []pair{{key, strings.Join(values, ",")}}
		}

		// Repeat format
		pairs := []pair{}
		for i := 0; i < value.Len(); i++ {
			itemKey := key
			if e.settings.ArrayFormat == ArrayQueryFormatIndices {
				itemKey = fmt.Sprintf("%s[%d]", key, i)
			} else if e.settings.ArrayFormat == ArrayQueryFormatBrackets {
				itemKey = key + "[]"
			}
			pairs = append(pairs, itemEncoder(itemKey, value.Index(i))...)
		}
		return pairs
	}
}

func (e *encoder) newMapEncoder(t reflect.Type) encoderFunc {
	itemEncoder := e.typeEncoder(t.Elem())
	return func(key string, value reflect.Value) []pair {
		pairs := []pair{}
		iter := value.MapRange()
		for iter.Next() {
			k := iter.Key().String()
			mapKey := k
			if key != "" {
				if e.settings.NestedFormat == NestedQueryFormatDots {
					mapKey = key + "." + k
				} else {
					mapKey = key + "[" + k + "]"
				}
			}
			pairs = append(pairs, itemEncoder(mapKey, iter.Value())...)
		}
		return pairs
	}
}

func (e *encoder) newPrimitiveEncoder() encoderFunc {
	return func(key string, value reflect.Value) []pair {
		var str string
		switch value.Kind() {
		case reflect.String:
			str = value.String()
		case reflect.Bool:
			if value.Bool() {
				str = "true"
			} else {
				str = "false"
			}
		case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
			str = fmt.Sprintf("%d", value.Int())
		case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
			str = fmt.Sprintf("%d", value.Uint())
		case reflect.Float32, reflect.Float64:
			str = fmt.Sprintf("%g", value.Float())
		default:
			str = fmt.Sprintf("%v", value.Interface())
		}
		return []pair{{key, str}}
	}
}

func (e *encoder) newTimeEncoder() encoderFunc {
	format := e.dateFormat
	return func(key string, value reflect.Value) []pair {
		t := value.Convert(reflect.TypeOf(time.Time{})).Interface().(time.Time)
		return []pair{{key, t.Format(format)}}
	}
}
