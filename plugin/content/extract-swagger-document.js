const oasSchema = generateSwaggerObject(window.wrappedJSObject.application);

browser.runtime.sendMessage({schema: JSON.stringify(oasSchema)}).then(function () {}).catch(function (e) {
    console.log(e);
});
