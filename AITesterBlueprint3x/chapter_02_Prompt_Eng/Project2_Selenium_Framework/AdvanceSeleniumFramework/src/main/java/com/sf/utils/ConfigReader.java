package com.sf.utils;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

public final class ConfigReader {

    private static final Properties PROPS = new Properties();
    private static final String CONFIG_PATH = "src/main/resources/config.properties";

    static {
        try (InputStream in = new FileInputStream(CONFIG_PATH)) {
            PROPS.load(in);
        } catch (IOException e) {
            throw new RuntimeException("Failed to load config.properties at " + CONFIG_PATH, e);
        }
    }

    private ConfigReader() {
    }

    public static String get(String key) {
        String value = PROPS.getProperty(key);
        if (value == null || value.isEmpty()) {
            throw new RuntimeException("Missing config key: " + key);
        }
        return value;
    }

    public static int getInt(String key) {
        try {
            return Integer.parseInt(get(key));
        } catch (NumberFormatException e) {
            throw new RuntimeException("Config key " + key + " is not an integer", e);
        }
    }
}
