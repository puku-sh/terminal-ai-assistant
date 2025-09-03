package config

import (
	"bufio"
	"os"
	"strings"
)

func LoadAPIKeys() map[string]string {
	keys := make(map[string]string)

	if openrouterKey := os.Getenv("OPENROUTER_API_KEY"); openrouterKey != "" {
		keys["openrouter"] = openrouterKey
	}

	if file, err := os.Open(".env"); err == nil {
		defer file.Close()
		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if strings.Contains(line, "=") && !strings.HasPrefix(line, "#") {
				parts := strings.SplitN(line, "=", 2)
				key := strings.TrimSpace(parts[0])
				value := strings.TrimSpace(parts[1])

				switch key {
				case "OPENROUTER_API_KEY":
					keys["openrouter"] = value
				}
			}
		}
	}

	return keys
}
