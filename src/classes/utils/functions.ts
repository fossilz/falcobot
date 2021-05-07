export async function asyncForEach<T>(array: Array<T>, callback: (arg: T, index?: number, array?: Array<T>) => Promise<void>) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
};

export function parseIntOrDefault(value: string|null|undefined, defaultValue: number): number {
    if (value === undefined || value === null) return defaultValue;
    const parsedVal = parseInt(value);
    return isNaN(parsedVal) ? defaultValue : parsedVal;
}