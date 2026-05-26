package base;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

import org.testng.annotations.BeforeSuite;

public class BaseTest {

    private static final Properties CONFIG = new Properties();

    @BeforeSuite(alwaysRun = true)
    public void setupSuite() {
        loadConfig();
    }

    private static void loadConfig() {
        if (!CONFIG.isEmpty()) {
            return;
        }

        try (InputStream inputStream = BaseTest.class.getClassLoader().getResourceAsStream("config.properties")) {
            if (inputStream == null) {
                throw new RuntimeException("config.properties file is missing in src/test/resources");
            }
            CONFIG.load(inputStream);
        } catch (IOException e) {
            throw new RuntimeException("Unable to load config.properties", e);
        }
    }

    public static String getBaseUrl() {
        loadConfig();
        return System.getProperty("base.url",
                System.getenv().getOrDefault("BASE_URL", CONFIG.getProperty("base.url")));
    }

    public static String getBasePath() {
        loadConfig();
        return System.getProperty("api.base.path", CONFIG.getProperty("api.base.path", ""));
    }

    public static String getApiKey() {
        loadConfig();
        return System.getProperty("api.key",
                System.getenv().getOrDefault("REQRES_API_KEY", CONFIG.getProperty("api.key", "")));
    }
}
