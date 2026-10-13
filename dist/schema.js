import { AppError, object } from './util.js';
/** Validate the JSON-schema subset used by this application's declared tools.
 * Upstream Serena schemas are forwarded unchanged and validated upstream. */
export function validateArguments(value, schemaValue, label = 'arguments') {
    const s = object(schemaValue, 'schema');
    if (s.enum !== undefined && (!Array.isArray(s.enum) || !s.enum.includes(value)))
        throw new AppError(`${label} has an unsupported value.`);
    if (s.type === 'object') {
        const v = object(value, label), properties = object(s.properties || {});
        for (const key of (Array.isArray(s.required) ? s.required : []))
            if (typeof key === 'string' && v[key] === undefined)
                throw new AppError(`${label}.${key} is required.`);
        for (const [key, item] of Object.entries(v)) {
            if (!(key in properties)) {
                if (s.additionalProperties === false)
                    throw new AppError(`${label}.${key} is not supported.`);
                continue;
            }
            validateArguments(item, properties[key], `${label}.${key}`);
        }
    }
    else if (s.type === 'string') {
        if (typeof value !== 'string')
            throw new AppError(`${label} must be text.`);
        if (typeof s.minLength === 'number' && value.length < s.minLength || typeof s.maxLength === 'number' && value.length > s.maxLength)
            throw new AppError(`${label} has an invalid length.`);
    }
    else if (s.type === 'integer' || s.type === 'number') {
        if (typeof value !== 'number' || !Number.isFinite(value) || s.type === 'integer' && !Number.isSafeInteger(value))
            throw new AppError(`${label} must be a finite ${s.type}.`);
        if (typeof s.minimum === 'number' && value < s.minimum || typeof s.maximum === 'number' && value > s.maximum)
            throw new AppError(`${label} is outside the allowed range.`);
    }
    else if (s.type === 'boolean') {
        if (typeof value !== 'boolean')
            throw new AppError(`${label} must be boolean.`);
    }
    else if (s.type === 'array') {
        if (!Array.isArray(value))
            throw new AppError(`${label} must be an array.`);
        if (typeof s.minItems === 'number' && value.length < s.minItems || typeof s.maxItems === 'number' && value.length > s.maxItems)
            throw new AppError(`${label} has an invalid number of entries.`);
        if (s.items)
            for (let i = 0; i < value.length; i++)
                validateArguments(value[i], s.items, `${label}[${i}]`);
    }
}
//# sourceMappingURL=schema.js.map