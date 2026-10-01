export const GRAVITY_M_S2 = 9.81;

function validateLaunch(initialSpeedMps, launchAngleDegrees) {
  if (!Number.isFinite(initialSpeedMps) || initialSpeedMps < 0) {
    throw new RangeError("Initial speed must be a non-negative finite value in m/s.");
  }

  if (
    !Number.isFinite(launchAngleDegrees) ||
    launchAngleDegrees < 0 ||
    launchAngleDegrees > 90
  ) {
    throw new RangeError("Launch angle must be between 0 and 90 degrees.");
  }
}

function getInitialVelocity(initialSpeedMps, launchAngleDegrees) {
  validateLaunch(initialSpeedMps, launchAngleDegrees);

  const angleRadians = (launchAngleDegrees * Math.PI) / 180;

  return {
    horizontalMps: initialSpeedMps * Math.cos(angleRadians),
    verticalMps: initialSpeedMps * Math.sin(angleRadians),
  };
}

// Position uses x = 0 and y = 0 as the launch point; time is measured in seconds.
// The ideal model assumes constant gravity, no air resistance, and a level landing surface.
export function calculatePosition(initialSpeedMps, launchAngleDegrees, timeSeconds) {
  if (!Number.isFinite(timeSeconds) || timeSeconds < 0) {
    throw new RangeError("Time must be a non-negative finite value in seconds.");
  }

  const { horizontalMps, verticalMps } = getInitialVelocity(
    initialSpeedMps,
    launchAngleDegrees,
  );

  return {
    xMeters: horizontalMps * timeSeconds,
    yMeters:
      verticalMps * timeSeconds - (GRAVITY_M_S2 * timeSeconds ** 2) / 2,
  };
}

// Returns horizontal and vertical velocity in m/s at the given time in seconds.
// Horizontal velocity is constant; gravity reduces the upward vertical velocity.
export function calculateVelocity(initialSpeedMps, launchAngleDegrees, timeSeconds) {
  if (!Number.isFinite(timeSeconds) || timeSeconds < 0) {
    throw new RangeError("Time must be a non-negative finite value in seconds.");
  }

  const { horizontalMps, verticalMps } = getInitialVelocity(
    initialSpeedMps,
    launchAngleDegrees,
  );

  return {
    horizontalMps,
    verticalMps: verticalMps - GRAVITY_M_S2 * timeSeconds,
  };
}

// For equal launch and landing heights, flight time is twice the upward travel time.
export function calculateFlightTime(initialSpeedMps, launchAngleDegrees) {
  const { verticalMps } = getInitialVelocity(initialSpeedMps, launchAngleDegrees);
  return (2 * verticalMps) / GRAVITY_M_S2;
}

// Maximum height above the launch point, in meters, occurs when vertical velocity is zero.
export function calculateMaximumHeight(initialSpeedMps, launchAngleDegrees) {
  const { verticalMps } = getInitialVelocity(initialSpeedMps, launchAngleDegrees);
  return verticalMps ** 2 / (2 * GRAVITY_M_S2);
}

// Horizontal range in meters, assuming the projectile lands at its launch height.
export function calculateRange(initialSpeedMps, launchAngleDegrees) {
  const { horizontalMps } = getInitialVelocity(initialSpeedMps, launchAngleDegrees);
  return horizontalMps * calculateFlightTime(initialSpeedMps, launchAngleDegrees);
}