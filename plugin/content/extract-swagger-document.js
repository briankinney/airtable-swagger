const oasSchema = generateSwaggerObject(window.wrappedJSObject.application);

console.log(JSON.stringify(oasSchema));
