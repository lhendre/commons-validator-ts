
Typescript version of
https://github.com/wix/commons-validator-js/blob/master/package.json
https://www.npmjs.com/package/commons-validator-js
Run
npm install commons-validator-ts

Example
import {EmailValidator} from "./emailValidator.service"
let validator = new EmailValidator();
if(validator.isValid(c.value)) {
    console.log('validated true')
    return null
}
else{
    console.log('validated false')
    return {
        validateEmail: {
            valid: false
        }
    }
}
