"use strict"
class SettingsSuite {
    /**
     * Creates a SettingsSuite.
     * @param {mixed[]?} validValues List of valid values
     */
    constructor(validValues) {
        /**
         * First found value.
         * @member {mixed}
         * @private
         */
        this.value = undefined

        /**
         * Default value.
         * @member {mixed}
         * @private
         */
        this.default = undefined

        /**
         * List of valid values.
         * @member {mixed[]}
         * @private
         */
        this.validValues = validValues
    }

    /**
     * Set default value
     * @param {mixed} value The default value.
     */
    setDefault(value) {
        this.default = this.prepareValue(value)

        return this
    }

    /**
     * Add a new setting value
     * @param {mixed} value
     */
    add(value) {
        if(this.value !== undefined) return this

        const preparedValue = this.prepareValue(value)
        if(preparedValue === undefined) return this

        if(this.validValues && this.validValues.indexOf(preparedValue) === -1) {
            return this
        }

        this.value = preparedValue

        return this
    }

    /**
     * Return the value found in the settings suite
     * @return {mixed}
     */
    getValue() {
        if(this.value === undefined) {
            return this.default
        } else {
            return this.value
        }
    }

    /**
     * This function is called everytime a setting value is added. It must be
     * instantiated in child classes.
     * @param {mixed} value The value to prepare
     * @return {mixed}
     * @protected
     */
    prepareValue(value) {
        return value
    }
}

class BooleanSettingsSuite extends SettingsSuite {
    prepareValue(value) {
        if(value === true || value === false) return value

        if(value === "true") return true
        if(value === "false") return false

        return undefined
    }
}

class IntegerSettingsSuite extends SettingsSuite {
    prepareValue(value) {
        const parsedValue = parseInt(value, 10)

        if(isNaN(parsedValue)) return undefined

        return parsedValue
    }
}
