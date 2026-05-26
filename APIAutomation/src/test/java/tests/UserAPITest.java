package tests;

import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;
import org.testng.SkipException;

import base.BaseTest;
import io.restassured.response.Response;
import payloads.PayloadData;
import utils.APIUtils;

public class UserAPITest extends BaseTest {

    @BeforeMethod(alwaysRun = true)
    public void initTest() {
        // Keeps each test isolated and ensures configuration is available.
        setupSuite();
    }

    private void assertAuthorizedStatusOrSkip(Response response, int expectedStatusCode) {
        if (response.getStatusCode() == 401 && "missing_api_key".equals(response.jsonPath().getString("error"))) {
            throw new SkipException("ReqRes API key is missing or invalid. Configure api.key in config.properties or -Dapi.key.");
        }
        Assert.assertEquals(response.getStatusCode(), expectedStatusCode, "Status code mismatch");
    }

    @Test(description = "GET user should return valid user details")
    public void getUserTest() {
        Response response = APIUtils.get("/users/2");

        assertAuthorizedStatusOrSkip(response, 200);
        Assert.assertTrue(response.jsonPath().getInt("data.id") > 0, "User ID should exist");
        Assert.assertEquals(response.jsonPath().getString("data.first_name"), "Janet",
                "First name should match expected value");
    }

    @Test(description = "POST user should create a new user")
    public void createUserTest() {
        String payload = PayloadData.createUserPayload("morpheus", "leader");
        Response response = APIUtils.post("/users", payload);

        assertAuthorizedStatusOrSkip(response, 201);
        Assert.assertEquals(response.jsonPath().getString("name"), "morpheus",
                "Created user name should match");
        Assert.assertNotNull(response.jsonPath().getString("id"), "Created user ID should exist");
    }

    @Test(description = "PUT user should update existing user")
    public void updateUserTest() {
        String payload = PayloadData.updateUserPayload("morpheus", "zion resident");
        Response response = APIUtils.put("/users/2", payload);

        assertAuthorizedStatusOrSkip(response, 200);
        Assert.assertEquals(response.jsonPath().getString("name"), "morpheus",
                "Updated user name should match");
        Assert.assertEquals(response.jsonPath().getString("job"), "zion resident",
                "Updated job should match");
    }

    @Test(description = "DELETE user should remove user successfully")
    public void deleteUserTest() {
        Response response = APIUtils.delete("/users/2");

        assertAuthorizedStatusOrSkip(response, 204);
    }
}
