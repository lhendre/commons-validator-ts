
import{ infrastructureTlds,genericTlds,countryCodeTlds } from "./domains"
const regexNonASCII = /[^\x20-\x7E]/;
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

export class DomainValidator {
    regexSeparators:any;// = /[\x2E\u3002\uFF0E\uFF61]/g; // RFC 3490 separators
    initialN:any;// = 128; // 0x80
    initialBias:any;// = 72;
    stringFromCharCode:any;// = String.fromCharCode;
    delimiter:any;// = '-'; // '\x2D'
    maxInt:any;// = 2147483647; // aka. 0x7FFFFFFF or 2^31-1
    floor:any;// = Math.floor;
    tMin:any;// = 1;
    base:any;// = 36;
    tMax:any;// = 26;
    damp:any;// = 700;
    baseMinusTMin:any;// = base - tMin;
    skew:any;// = 38;
    domainLabelRegex:any;
    topLabelRegex:any;
    domainNameRegex:any;
    _domainRegex:any;
    // regexNonASCII:any;


    constructor() {
        console.log('domain created');
        this.regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g; // RFC 3490 separators
        this.initialN = 128; // 0x80
        this.initialBias = 72;
        this.stringFromCharCode = String.fromCharCode;
        this.delimiter = '-'; // '\x2D'
        this.maxInt = 2147483647; // aka. 0x7FFFFFFF or 2^31-1
        this.floor = Math.floor;
        this.tMin = 1;
        this.base = 36;
        this.tMax = 26;
        this.damp = 700;
        this.baseMinusTMin = this.base - this.tMin;
        this.skew = 38;

        this.domainLabelRegex = "[a-zA-Z0-9](?:[a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?";
        this.topLabelRegex = "[a-zA-Z](?:[a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?";
        this.domainNameRegex = "^(?:" + this.domainLabelRegex + "\\.)*(" + this.topLabelRegex + ")\\.?$";
        this._domainRegex = new RegExp(this.domainNameRegex);

}


    digitToBasic (digit, flag) {
        //  0..25 map to ASCII a..z or A..Z
        // 26..35 map to ASCII 0..9
        return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
    };

    errors = {
        'overflow': 'Overflow: input needs wider integers to process',
        'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
        'invalid-input': 'Invalid input'
    };

    error(type) {
        throw new RangeError(this.errors[type]);
    }

    adapt(delta, numPoints, firstTime) {
        let k = 0;
        delta = firstTime ? this.floor(delta / this.damp) : delta >> 1;
        delta += this.floor(delta / numPoints);
        for (/* no initialization */; delta > this.baseMinusTMin * this.tMax >> 1; k += this.base) {
            delta = this.floor(delta / this.baseMinusTMin);
        }
        return this.floor(k + (this.baseMinusTMin + 1) * delta / (delta + this.skew));
    };

    basicToDigit(codePoint) {
        if (codePoint - 0x30 < 0x0A) {
            return codePoint - 0x16;
        }
        if (codePoint - 0x41 < 0x1A) {
            return codePoint - 0x41;
        }
        if (codePoint - 0x61 < 0x1A) {
            return codePoint - 0x61;
        }
        return this.base;
    };
    ucs2decode(string) {
        const output = [];
        let counter = 0;
        const length = string.length;
        while (counter < length) {
            const value = string.charCodeAt(counter++);
            if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
                // It's a high surrogate, and there is a next character.
                const extra = string.charCodeAt(counter++);
                if ((extra & 0xFC00) == 0xDC00) { // Low surrogate.
                    output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
                } else {
                    // It's an unmatched surrogate; only append this code unit, in case the
                    // next code unit is the high surrogate of a surrogate pair.
                    output.push(value);
                    counter--;
                }
            } else {
                output.push(value);
            }
        }
        return output;
    }
    contains(a, obj) {
        var i = a.length;
        while (i--) {
            if (a[i] === obj) {
                return true;
            }
        }
        return false;
    }

    encode (input) {
        const output = [];

        // Convert the input in UCS-2 to an array of Unicode code points.
        input = this.ucs2decode(input);

        // Cache the length.
        let inputLength = input.length;

        // Initialize the state.
        let n = this.initialN;
        let delta = 0;
        let bias = this.initialBias;

        // Handle the basic code points.
        for (const currentValue of input) {
            if (currentValue < 0x80) {
                output.push(this.stringFromCharCode(currentValue));
            }
        }

        let basicLength = output.length;
        let handledCPCount = basicLength;

        // `handledCPCount` is the number of code points that have been handled;
        // `basicLength` is the number of basic code points.

        // Finish the basic string with a delimiter unless it's empty.
        if (basicLength) {
            output.push(this.delimiter);
        }

        // Main encoding loop:
        while (handledCPCount < inputLength) {

            // All non-basic code points < n have been handled already. Find the next
            // larger one:
            let m = this.maxInt;
            for (const currentValue of input) {
                if (currentValue >= n && currentValue < m) {
                    m = currentValue;
                }
            }

            // Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
            // but guard against overflow.
            const handledCPCountPlusOne = handledCPCount + 1;
            if (m - n > this.floor((this.maxInt - delta) / handledCPCountPlusOne)) {
                this.error('overflow');
            }

            delta += (m - n) * handledCPCountPlusOne;
            n = m;

            for (const currentValue of input) {
                if (currentValue < n && ++delta > this.maxInt) {
                    this.error('overflow');
                }
                if (currentValue == n) {
                    // Represent delta as a generalized variable-length integer.
                    let q = delta;
                    for (let k = this.base; /* no condition */; k += this.base) {
                        const t = k <= bias ? this.tMin : (k >= bias + this.tMax ? this.tMax : k - bias);
                        if (q < t) {
                            break;
                        }
                        const qMinusT = q - t;
                        const baseMinusT = this.base - t;
                        output.push(
                            this.stringFromCharCode(this.digitToBasic(t + qMinusT % baseMinusT, 0))
                        );
                        q = this.floor(qMinusT / baseMinusT);
                    }

                    output.push(this.stringFromCharCode(this.digitToBasic(q, 0)));
                    bias = this.adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
                    delta = 0;
                    ++handledCPCount;
                }
            }

            ++delta;
            ++n;

        }
        return output.join('');
    };

    map(array, fn) {
        const result = [];
        let length = array.length;
        while (length--) {
            result[length] = fn(array[length]);
        }
        return result;
    }
    mapDomain(string, fn) {
        const parts = string.split('@');
        let result = '';
        if (parts.length > 1) {
            // In email addresses, only the domain name should be punycoded. Leave
            // the local part (i.e. everything up to `@`) intact.
            result = parts[0] + '@';
            string = parts[1];
        }
        // Avoid `split(regex)` for IE8 compatibility. See #17.
        string = string.replace(this.regexSeparators, '\x2E');
        const labels = string.split('.');
        const encoded = this.map(labels, fn).join('.');
        return result + encoded;
    }

    /**
     * @param allowLocal   Should local addresses be considered valid?
     */
    DomainValidator() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var _ref$allowLocal = _ref.allowLocal;
        var allowLocal = _ref$allowLocal === undefined ? false : _ref$allowLocal;

        _classCallCheck(this, DomainValidator);

        var domainLabelRegex = "[a-zA-Z0-9](?:[a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?";
        var topLabelRegex = "[a-zA-Z](?:[a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?";
        var domainNameRegex = "^(?:" + domainLabelRegex + "\\.)*(" + topLabelRegex + ")\\.?$";
        this._domainRegex = new RegExp(domainNameRegex);
    }

    _chompLeadingDot(str) {
        console.log('in _chompLeadingDot ')

        if (str[0] === ".") {
            return str.substring(1)
            console.log('in _chompLeadingDot ')

        }
        return str
    }


    _unicodeToASCII(input) {
        console.log('in _unicodeToASCII ')

        return this.mapDomain(input, function(string) {
            return regexNonASCII.test(string)
                ? 'xn--' + this.encode(string)
                : string;
        });    }
    _arrayContains(sortedArray, key) {
        console.log('in _arrayContains ')

        // TODO: use binary search
        return this.contains(sortedArray,key);
    }

    isValidCountryCodeTld(ccTld) {
        console.log('in isValidCountryCodeTld ')
        console.log(countryCodeTlds)

        const key = this._chompLeadingDot(this._unicodeToASCII(ccTld).toLowerCase())
        return this._arrayContains(countryCodeTlds, key)
    }
    isValidGenericTld(gTld) {
        console.log('in isValidGenericTld ')
        console.log(genericTlds)
        const key = this._chompLeadingDot(this._unicodeToASCII(gTld).toLowerCase())
        return this._arrayContains(genericTlds, key)
    }
    isValidInfrastructureTld(iTld) {
        console.log('in isValidInfrastructureTld ')
        console.log(infrastructureTlds)

        const key = this._chompLeadingDot(this._unicodeToASCII(iTld).toLowerCase())
        return this._arrayContains(infrastructureTlds, key)
    }
    isValidTld(tld) {
        console.log('in isValidTldfulp  ')

        tld = this._unicodeToASCII(tld)
        return this.isValidInfrastructureTld(tld) || this.isValidGenericTld(tld) || this.isValidCountryCodeTld(tld)
    }
    extractTld(domain) {
        console.log('in extract tld')
        if (!domain) {
            console.log('in extract tld  !domain')

            return false
        }

        domain = this._unicodeToASCII(domain)
        if (domain.length > 253) {
            console.log('in extract tld domain lenght')

            return false
        }
        const groups = domain.match(this._domainRegex)
        if (groups) {
            console.log('group')

            return groups[1]
        }
        console.log('in extract tld null')

        return null
    }
    isValid(domain) {
        console.log('is valid in domain module')
        if (!domain) {
            console.log('in domain and domain validated false')
            return false
        }

        domain = this._unicodeToASCII(domain)
        if (domain.length > 253) {
            console.log('too long')
            return false
        }
        const groups = domain.match(this._domainRegex)
        if (groups) {
        }
        if (groups && groups.length > 1) {
            console.log('true now checking is validTLD')
            return this.isValidTld(groups[1]) && (groups[0] !== groups[1])
        }
        return false
    }Z

};
