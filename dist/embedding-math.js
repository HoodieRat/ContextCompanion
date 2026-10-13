import { AppError } from './util.js';
export function normalize(values) {
    if (!values.length || values.some(value => !Number.isFinite(value)))
        throw new AppError('The embedding service returned invalid numbers.', 502);
    const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
    if (norm < 1e-12)
        throw new AppError('The embedding service returned a zero vector.', 502);
    return values.map(v => v / norm);
}
export function weightedMean(vectors, weights) {
    const dimension = vectors[0]?.length;
    if (!dimension || weights.length !== vectors.length)
        throw new AppError('Invalid embedding window sizes.');
    const result = Array(dimension).fill(0);
    vectors.forEach((vector, i) => {
        if (vector.length !== dimension)
            throw new AppError('Embedding dimensions changed within a document.');
        for (let j = 0; j < dimension; j++)
            result[j] = result[j] + vector[j] * weights[i];
    });
    return normalize(result);
}
export function windows(tokens, size = 220, overlap = 20) {
    if (size <= overlap || size < 1 || overlap < 0)
        throw new AppError('Invalid token window parameters.');
    const result = [];
    for (let start = 0; start < tokens.length; start += size - overlap) {
        const values = tokens.slice(start, start + size);
        result.push({ values, weight: values.length - (start ? overlap : 0) });
        if (start + size >= tokens.length)
            break;
    }
    return result;
}
//# sourceMappingURL=embedding-math.js.map