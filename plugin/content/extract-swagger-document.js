let oasSchema;

try {
    oasSchema = generateSwaggerObject(window.wrappedJSObject.application);
}
catch (e) {
    console.log(e);
}

browser.runtime.sendMessage({schema: JSON.stringify(oasSchema)}).then(function () {}).catch(function (e) {
    console.log(e);
});
