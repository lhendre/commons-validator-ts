import {DomainValidator} from "./domainValidator";


export class EmailValidator {
    /**
     * @param allowLocal   Should local addresses be considered valid?
     * @param allowTld     Should TLDs be allowed?
     */
    _userPattern:any;
    _emailPattern:any;
    _domainValidator:any;
    _allowTld:any;

    constructor({allowLocal = false, allowTld = false} = {}) {
        //const specialChars = "\\p{Cntrl}\\(\\)<>@,;:'\\\\\\\"\\.\\[\\]" // TODO: \\p{Cntrl}
        const specialChars = "\\(\\)<>@,;:'\\\\\\\"\\.\\[\\]"
        const validChars = "(\\\\.)|[^\\s" + specialChars + "]"
        const quotedUser = "(\"(\\\\\"|[^\"])*\")"
        const word = "((" + validChars + "|')+|" + quotedUser + ")"
        const userRegex = "^\\s*" + word + "(\\." + word + ")*$"
        this._userPattern = new RegExp(userRegex)

        const emailRegex = "^\\s*?(.+)@(.+?)\\s*$"
        this._emailPattern = new RegExp(emailRegex)

        this._domainValidator = new DomainValidator()
        this._allowTld = allowTld
    }
    _isValidDomain(domain) {
        console.log('domain')
        if (this._allowTld) {
            return this._domainValidator.isValid(domain) || ((domain[0] !== ".") && this._domainValidator.isValidTld(domain))
        } else {
            return this._domainValidator.isValid(domain)
        }
    }
    _isValidUser(user) {
        console.log('user')
        if (!user || (user.length > 64)) {
            return false
        }
        console.log('user true')


        return user.match(this._userPattern)
    }
    isValid(email) {
        console.log('in email validator')
        if (!email) {
            return false
        }

        if (email[email.length - 1] === ".") {
            return false
        }

        const groups = email.match(this._emailPattern)
        console.log(email);
        console.log(this._emailPattern);
        if (!groups) {
            console.log('is valid group false')


            return false
        }

        if (!this._isValidUser(groups[1])) {
            console.log('is validuser false')
            return false
        }

        if (!this._isValidDomain(groups[2])) {
            console.log('is valid domain false')

            return false
        }
        console.log('is valid email true')

        return true
    }
}

