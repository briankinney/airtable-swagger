airtable-swagger
===

Generate OAS 3.0 API definition from Airtable schema object

Background
---

Every Airtable base has an auto-generated documentation page that is largely driven by an object that describes the
schema of the base. This utility will convert the schema object into an OAS 3.0 (swagger) document so you can take
advantage of tools that make use of this API definition format.


Firefox Addon
---

### Setup

[Download link](https://addons.mozilla.org/en-US/firefox/addon/airtable-swagger-generator/)

### Usage

1. Open your Airtable documentation page
2. Click this icon in your URL bar to open the side panel

    ![Url bar icon](plugin/icons/icons8-user-manual-48.png)
3. Click the button. An OAS json blob should appear in the text area above

Command Line Tool
---

### Setup

Install from source using npm
```bash
your-computer:/path/to/airtable-swagger$ npm i -g .
```

### Usage

1. View the source of the Airtable documentation page generated for your base
2. Find the line containing `window.application = {...}`
3. Copy the value of `window.application` to a file, ex: `airtable-schema.json`
4. Run the tool:
    ```bash
    airtable-swagger /path/to/airtable-schema.json
    ```
5. Use the output with your favorite swagger tool