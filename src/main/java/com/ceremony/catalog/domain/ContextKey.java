package com.ceremony.catalog.domain;

public record ContextKey(
    String pathType,
    String formCode,
    String formVersion,
    String action,
    String productCode,
    String productSubCode,
    String loanProductCode
) {
    @Override
    public String toString() {
        return String.join("|",
            safe(pathType), safe(formCode), safe(formVersion),
            safe(action), safe(productCode), safe(productSubCode),
            safe(loanProductCode)
        );
    }
    private static String safe(String value) {
        return value == null ? "" : value;
    }
}