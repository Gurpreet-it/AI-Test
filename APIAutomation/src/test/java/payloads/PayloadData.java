package payloads;

public final class PayloadData {

    private PayloadData() {
    }

    public static String createUserPayload(String name, String job) {
        return "{\"name\":\"" + name + "\",\"job\":\"" + job + "\"}";
    }

    public static String updateUserPayload(String name, String job) {
        return "{\"name\":\"" + name + "\",\"job\":\"" + job + "\"}";
    }
}
