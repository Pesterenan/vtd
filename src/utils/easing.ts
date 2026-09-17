/** Interpolates the `value` between `start` and `end`
 * @param {boolean} clampOutput [false] - if true, clamps the output to the min and max values
 * @returns the value between `start` and `end` */
export const linearInterpolation = (
  start: number,
  end: number,
  value: number,
  clampOutput = false,
): number => {
  const lerpValue = (1.0 - value) * start + value * end;
  return clampOutput ? clamp(lerpValue, start, end) : lerpValue;
};

/** Inverse interpolates the `value` between `start` and `end`
 * @param {boolean} clampOutput [false] - if true, clamps the output to the min and max values
 * @returns the value between `start` and `end` */
export const inverseLinearInterpolation = (
  start: number,
  end: number,
  value: number,
  clampOutput = false,
): number => {
  const inlerpValue = (value - start) / (end - start);
  return clampOutput ? clamp(inlerpValue, start, end) : inlerpValue;
};

/** Clamps a `value` between the `minimum` and `maximum` values */
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
 * @param {boolean} clampOutput [false] - if true, clamps the output to the min and max values
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
