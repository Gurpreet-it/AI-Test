package utils;

import base.BaseTest;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;

public final class APIUtils {

    private APIUtils() {
    }

    private static RequestSpecification getRequestSpec() {
        RequestSpecification requestSpecification = RestAssured
                .given()
                .baseUri(BaseTest.getBaseUrl())
                .basePath(BaseTest.getBasePath())
                .contentType(ContentType.JSON)
                .log()
                .all();

        String apiKey = BaseTest.getApiKey();
        if (apiKey != null && !apiKey.isBlank()) {
            requestSpecification.header("x-api-key", apiKey);
        }

        return requestSpecification;
    }

    public static Response get(String endpoint) {
        return getRequestSpec()
                .when()
                .get(endpoint)
                .then()
                .log()
                .all()
                .extract()
                .response();
    }

    public static Response post(String endpoint, String payload) {
        return getRequestSpec()
                .body(payload)
                .when()
                .post(endpoint)
                .then()
                .log()
                .all()
                .extract()
                .response();
    }

    public static Response put(String endpoint, String payload) {
        return getRequestSpec()
                .body(payload)
                .when()
                .put(endpoint)
                .then()
                .log()
                .all()
                .extract()
                .response();
    }

    public static Response delete(String endpoint) {
        return getRequestSpec()
                .when()
                .delete(endpoint)
                .then()
                .log()
                .all()
                .extract()
                .response();
    }
}
