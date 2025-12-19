# Sample XML Files

These files are representative XML documents for testing the UI's `xmlParser.ts` implementation. They cover different contexts, structures, and edge cases.

## Files

| File | Context | Root Element | Key Features |
|------|---------|--------------|--------------|
| `loan_application_dda.xml` | loans | `<loan_info>` | Attributes (`type="mobile"`), `xsi:nil`, empty elements, nested structures |
| `loan_application_mortgage.xml` | loans | `<loan_info>` | Multiple fees (array), co-borrower, optional fields |
| `deposit_dda_fulfillment.xml` | deposits | `<Ceremony>` | Multiple disclosures (array), `xsi:nil`, product codes |
| `deposit_savings_inquiry.xml` | deposits | `<Ceremony>` | Multiple accounts, transactions, nested balances |
| `ondemand_statement.xml` | ondemand | `<OnDemand>` | Sequence attributes, many transactions, render options |

## Expected Parser Behavior

The `xmlParser.ts` should extract observations matching these rules:

### Field Path Extraction
- Only **leaf elements** (elements with no child elements) are extracted
- Attributes become separate paths: `/Root/Element/@attr`
- Namespaces are stripped (use `localName` only)
- Paths are hierarchical: `/Root/Parent/Child`

### Example: `loan_application_dda.xml`

Expected field paths (partial list):
```
/loan_info/LoanDetails/LoanNumber
/loan_info/LoanDetails/LoanType
/loan_info/LoanDetails/Term
/loan_info/LoanDetails/Amount
/loan_info/Borrower/PrimaryBorrower/Name/FirstName
/loan_info/Borrower/PrimaryBorrower/Name/MiddleName     (hasNull: true)
/loan_info/Borrower/PrimaryBorrower/Address/Street2     (hasEmpty: true)
/loan_info/Borrower/PrimaryBorrower/Phone/@type         (attribute)
/loan_info/Borrower/CoBorrower                          (hasNull: true)
/loan_info/Fees/Fee/@type                               (occurs: 2)
```

### Edge Cases to Test

| Case | Example | Expected |
|------|---------|----------|
| `xsi:nil="true"` | `<MiddleName xsi:nil="true"/>` | `hasNull: true` |
| Empty element | `<Street2></Street2>` | `hasEmpty: true` |
| Self-closing empty | `<Street2/>` | `hasEmpty: true` |
| Whitespace only | `<Category>   </Category>` | `hasEmpty: true` |
| Attribute | `<Phone type="mobile">` | Path: `/Phone/@type` |
| Repeated element | Multiple `<Fee>` elements | `count: 2` (or more) |
| Nested structure | `<Balance><Current>` | Path includes full hierarchy |

### Counts vs Occurrences

The `count` field represents how many times a field appears **within a single document**:
- `/loan_info/Fees/Fee/@type` appears 2 times in `loan_application_dda.xml`
- `/loan_info/Borrower/PrimaryBorrower/Phone` appears 2 times (mobile + home)

When multiple documents are uploaded, the catalog merges these into `minOccurs`/`maxOccurs` ranges.

## Context Metadata

When uploading these files, use appropriate metadata:

| Context | Required Metadata | Example Values |
|---------|------------------|----------------|
| loans | `loanType` | `AUTO`, `MORTGAGE` |
| deposits | `productCode`, `productSubCode`, `action` | `DDA`/`4S`/`FULFILLMENT`, `SAV`/`HY`/`INQUIRY` |
| ondemand | `documentCode` | `STMT001` |
