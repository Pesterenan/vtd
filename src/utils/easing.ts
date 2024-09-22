export const linearInterpolation = (
  start: number,
  end: number,
  value: number,
): number => {
  return (1.0 - value) * start + value * end;
};

export const inverseLinearInterpolation = (
  start: number,
  end: number,
  value: number,
): number => {
  return (value - start) / (end - start);
};

export const clamp = (
  value: number,
  minimum: number,
  maximum: number,
): number => {
  return Math.max(Math.min(value, maximum), minimum);
};

/** Remaps an input value to an output value using lerp
 * @param {number} inputMin - min starting from
 * @param {number} inputMax - max starting from
 * @param {number} outputMin - min going to
 * @param {number} outputMax - max going to
 * @param {number} value - the value to be mapped
 * @param {boolean} clampOutput - if true, clamps the output to the  min and max values
 */
export const remap = (
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number,
  value: number,
  clampOutput = false,
): number => {
  const between = inverseLinearInterpolation(inputMin, inputMax, value);
  const remappedOutput = linearInterpolation(outputMin, outputMax, between);
  return clampOutput
    ? clamp(remappedOutput, outputMin, outputMax)
    : remappedOutput;
};
