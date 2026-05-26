package com.sf.tests;

import com.sf.base.BaseTest;
import com.sf.pages.LoginPage;
import org.testng.Assert;
import org.testng.annotations.BeforeTest;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

public class InvalidLoginTest extends BaseTest {

    @BeforeTest(alwaysRun = true)
    public void suiteInit() {
        System.out.println("Starting InvalidLoginTest suite against Salesforce login");
    }

    @DataProvider(name = "invalidCredentials")
    public Object[][] invalidCredentialsProvider() {
        return new Object[][]{
                {"", "", "empty username and password"},
                {"", "SomePass@123", "empty username"},
                {"invaliduser@example.com", "", "empty password"},
                {"invaliduser@example.com", "WrongPass!23", "invalid username and password"},
                {"not-an-email", "AnyPass@1", "malformed username"}
        };
    }

    @Test(dataProvider = "invalidCredentials", priority = 1, groups = {"negative", "regression"})
    public void verifyLoginFailsForInvalidCredentials(String username, String password, String scenario) {
        LoginPage loginPage = new LoginPage(driver);
        Assert.assertTrue(loginPage.isLoginPageLoaded(),
                "Login page not loaded for scenario: " + scenario);

        loginPage.loginAs(username, password);

        boolean errorVisible = loginPage.isErrorDisplayed();
        boolean stillOnLoginPage = loginPage.getCurrentUrl().contains("login.salesforce.com");

        Assert.assertTrue(errorVisible || stillOnLoginPage,
                "Expected failure indicator (error message or stayed on login page) for scenario: "
                        + scenario + " | actualUrl=" + loginPage.getCurrentUrl());

        if (errorVisible) {
            String err = loginPage.getErrorMessage();
            Assert.assertFalse(err.isEmpty(),
                    "Error element visible but text empty for scenario: " + scenario);
        }
    }

    @Test(priority = 2, groups = {"negative", "ui"})
    public void verifyErrorElementNotShownOnFreshLoad() {
        LoginPage loginPage = new LoginPage(driver);
        Assert.assertTrue(loginPage.isLoginPageLoaded(), "Login page failed to load");
        Assert.assertFalse(loginPage.isErrorDisplayed(),
                "Error message unexpectedly displayed on fresh login page load");
    }
}
