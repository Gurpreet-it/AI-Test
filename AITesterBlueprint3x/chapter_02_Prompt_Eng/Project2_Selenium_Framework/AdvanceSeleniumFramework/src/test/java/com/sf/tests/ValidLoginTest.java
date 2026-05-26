package com.sf.tests;

import com.sf.base.BaseTest;
import com.sf.pages.LoginPage;
import com.sf.utils.ConfigReader;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Assert;
import org.testng.annotations.BeforeTest;
import org.testng.annotations.Test;

import java.time.Duration;

public class ValidLoginTest extends BaseTest {

    private String validUser;
    private String validPass;

    @BeforeTest(alwaysRun = true)
    public void loadCredentials() throws Exception {
        validUser = ConfigReader.get("app.username");
        validPass = ConfigReader.get("app.password");
        if (validUser.startsWith("REPLACE_WITH") || validPass.startsWith("REPLACE_WITH")) {
            throw new Exception("Configure real Salesforce credentials in config.properties before running ValidLoginTest");
        }
    }

    @Test(priority = 1, groups = {"smoke", "ui"})
    public void verifyLoginPageIsLoaded() {
        LoginPage loginPage = new LoginPage(driver);
        Assert.assertTrue(loginPage.isLoginPageLoaded(), "Login page did not load");
        Assert.assertTrue(loginPage.getPageTitle().toLowerCase().contains("login"),
                "Page title does not contain 'login'. Actual: " + loginPage.getPageTitle());
        Assert.assertTrue(loginPage.isForgotPasswordLinkPresent(),
                "Forgot Password link not displayed on login page");
    }

    @Test(priority = 2, groups = {"smoke", "regression"})
    public void verifySuccessfulLoginWithValidCredentials() throws Exception {
        LoginPage loginPage = new LoginPage(driver);
        Assert.assertTrue(loginPage.isLoginPageLoaded(), "Login page not loaded prior to login");

        loginPage.toggleRememberMe();
        loginPage.loginAs(validUser, validPass);

        WebDriverWait wait = new WebDriverWait(driver,
                Duration.ofSeconds(ConfigReader.getInt("timeout.explicit")));
        wait.until(ExpectedConditions.not(ExpectedConditions.urlContains("login.salesforce.com/?locale=in")));

        String currentUrl = driver.getCurrentUrl();
        Assert.assertFalse(currentUrl.contains("login.salesforce.com/?locale=in"),
                "Still on login page after submit. URL: " + currentUrl);
        Assert.assertFalse(loginPage.isErrorDisplayed(),
                "Error message displayed for valid credentials: " + loginPage.getErrorMessage());
    }
}
