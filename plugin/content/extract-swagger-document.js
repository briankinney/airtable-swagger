const oasSchema = generateSwaggerObject(window.wrappedJSObject.application);

console.log(`attempting to send ${oasSchema}`);
browser.runtime.sendMessage({schema: JSON.stringify(oasSchema)}).then(function () {
    console.log('sent?');
}).catch(function (e) {
    console.log(e);
});
