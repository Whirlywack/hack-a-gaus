# CodeCells

A six-digit code drawn as six ruled cells that share their borders, over one real input.

- **Use:** Confirming an e-mail address with the code from a letter. The cell being typed into takes a 2px accent outline and a caret; the code is checked as soon as the sixth digit is in.
- **Provide:** The digits typed so far, and whether it is being checked.
- **Do not:** Do not build it from six separate inputs: one input keeps paste and the phone code suggestion working. Not for a password or a company code; those are a Field.
