# The Vision: What Changes When the Catalog UI Launches

*This document captures the user experience transformation that the Ceremony Field Catalog UI enables.*

---

## The Before: A Frustration You Know Too Well

Right now, a developer needs to answer *"What fields does document STMT001 actually use?"*

This takes **hours**.

They crawl through XSLT files that reference other XSLT files. They find a transform that says "grab productCode from the input," but `productCode` itself? That's defined 400 lines away in a shared library. They ask Steve. Steve's in a meeting. They look at logs—which tells them what *this specific run* used, not what the system *supports*.

They build their new system with 20 fields, deploy it, and six months later a QA report shows they missed `fieldX` which appears in 3% of ceremonies during March. Why wasn't it documented? Because the legacy system doesn't know it exists—it just passes it through.

> **The knowledge lives in people's heads, in scattered Slack conversations, in code that was written to solve one problem eight years ago and now handles five. The system itself is a black box that nobody understands completely.**

---

## The After: The Relief

She opens the application for the first time.

The interface is clean. Navy blue, minimal, corporate-professional. *None of the noise.* She sees a single search box on the home page: "Search fields or contexts..."

She types "Amount" and in **1.8 seconds**, the interface shows her 23 fields across all contexts that contain "Amount" in their path or context name. Simple. No scrolling through documentation. No guessing. The results table shows fieldPath, context, min/max occurrences, whether null/empty values are possible. She can click any field and a panel slides out from the right showing the full XPath, the context it belongs to, all the metadata that determines when this field appears, and those occurrence statistics.

For 80% of her work, this is enough. *"What fields exist for deposits?"* Now it's two seconds, not two hours.

But some days she needs to dig deeper.

She clicks **"Advanced Search"** and a different interface appears. This one is for precision. She selects a context dropdown: "deposits". The moment she does, new filter inputs appear below it—the ones *this context* defines: `productCode`, `productSubCode`, `action`.

She types "DDA" in productCode, and as she types, suggestions appear: "DDA", "SAV", "MMA". She selects "DDA".

Now she types "/" in the Field Path input, and the autocomplete understands: *Show me field paths that exist in the deposits context where productCode is DDA.* Suggestions appear: `/Ceremony/Accounts/Account/Amount`, `/Ceremony/Accounts/Account/Balance`, `/Ceremony/Customer/Name`...

She narrows to `/Ceremony/Account/Fee*` using a pattern. The table updates. **47 fields.** She can see min/max occurrences—"Oh, this one maxes at 5, so we can handle arrays." She hovers over a row and the text highlighting shows which part matched her pattern.

She exports the result as CSV. Twelve seconds. What would have been a spreadsheet she manually assembled from code review now downloads directly. She shares it with her team in Slack: *"Here's what we need to support for DDA deposits."*

---

## Three Transformations

### Scenario 1: The Developer With a Question

**Before:**

- Opens legacy system code
- Spends 45 minutes tracing transforms
- Asks Steve: "Does STMT001 use Customer/SSN?"
- Steve doesn't answer for 3 hours
- Deploys without it, breaks production
- Postmortem: *"Why didn't we know this field was needed?"*

**After:**

- Opens catalog, searches "STMT001"
- Two results (STMT001 appears in 2 contexts)
- Clicks to advanced search, filters to `renderdata` context, `documentCode=STMT001`
- Sees 156 fields used by this document
- Scrolls and searches for "SSN" within those results
- Finds: `/Customer/SSN` — `minOccurs: 1`, `allowsNull: false` — *This field is required.*
- Checks her code: "Oh, I see—we're not passing it. Fix takes 2 minutes."

> **Time: 6 minutes start-to-answer. Confidence: 100%.**

---

### Scenario 2: The QA Engineer With Observations to Contribute

**Before:**

- Has an XML file with interesting data from an edge case
- Thinks *"I should upload this so we know what fields we see in this scenario"*
- Realizes: there's no way to upload to the legacy system
- Sends it to Steve in email with a note: "might be useful someday"
- It gets lost
- 18 months later, the team encounters that edge case during modernization and rebuilds something they already knew about

**After:**

- Notices an XML file with an interesting rare value in a field
- Goes to the catalog UI, clicks **"Upload"**
- Drags three XML files into the drop zone
- Is asked: "What context?" — selects "deposits"
- Is asked for metadata: `productCode` (DDA), `productSubCode` (4S), `action` (Fulfillment)
- Autocomplete helps her—she types "DD" and "DDA" appears
- She hits Upload
- Gets back: *"Extracted 847 observations from 3 files. Submitted successfully."*
- Those observations merge into the catalog statistics

**Result:** The next time someone asks *"Have we ever seen Product X with this field?"*, the answer is definitive: "Yes, 47 times. Always non-null. Occurs 1-3 times."

Contribution made. Knowledge preserved. No email. No manual follow-up needed.

---

### Scenario 3: The Business Analyst Building Compliance Documentation

**Before:**

- Task: *"Prove to the auditor that we're capturing all required SSN fields in SAV documents"*
- Manually pulls XSD for SAV (which template team owns)
- Compares it to 40 lines of XSLT from the legacy system
- Finds a discrepancy—SAV schema says SSN should be sent, but does the system ever actually send it?
- Has to trace through code paths for all 8 SAV sub-types
- Spends 3 days building a matrix in Excel
- Updates it when anything changes (which is often)

**After:**

- Goes to advanced search
- Context: `renderdata`
- `documentCode`: SAV* (uses wildcard or manually selects all 8 SAV codes)
- Her table shows: Which fields are sent to SAV documents? What's their occurrence pattern? Can they be null?
- She can compare SAV001 vs SAV002: *"Oh interesting—SAV002 includes CustomerTaxId but SAV001 doesn't."*
- She exports this as JSON, loads it into a Jupyter notebook, does some analysis
- Creates a chart: "100% of ceremonies send SSN for SAV documents" — which is what the auditor needs to see

**All this data is live from production observations, not speculation.**

Time: 1 hour. Confidence: *This is what production actually sends, not what the code claims to send.*

---

## The Deeper Shift

What's really happening here is a shift from **tribal knowledge** to **empirical fact**.

Right now, when someone says *"Does field X exist?"* the answer is either:

- *"I think so?"* — uncertainty, fear of being wrong
- *"Let me check with Steve"* — bottleneck, dependency, slow
- *"Let me dig through code"* — hours of work, error-prone

After this UI launches, the answer is:

- **"Let me look it up"** — 30 seconds, definitive

> **That's not a small change. That's permission to move faster. That's confidence to refactor. That's the ability to onboard a new person without them needing three weeks of embedded knowledge transfer.**

When someone new joins and says *"How do we handle tax documents?"* they don't get "Well, it's complicated, ask Steve." They go to the catalog, select `context=renderdata`, `documentCode=TAX*`, and see exactly what 18 months of production data shows. They see patterns. They see constraints. They build their changes confidently because they're working with **fact, not folklore**.

The QA engineer who finds edge cases—their work now *matters*. It feeds the system. Observations aren't lost emails, they're data that makes the whole team smarter.

The business analyst isn't building compliance documentation by manually tracing code. She's querying production reality.

*This is what it means to know your system.*

---

## The Moment It Lands

Imagine Steve's inbox three weeks after launch. The daily *"What fields does [product] use?"* emails drop by 60%. Not because people are avoiding him—because people found the answer themselves, instantly. The ones that still come to him are nuanced questions that need discussion, not information retrieval.

Your team ships the next feature **30% faster** because they don't spend days reverse-engineering field requirements. They look them up.

The modernization project that was scheduled to take three years? The blocking question—*"What fields do we actually need to support?"*—is no longer a mystery. It's measurable. It's queryable. It's in the database.

> **That's not just a tool. That's an organizational unlock. This UI is the key.**
