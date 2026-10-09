const { ROLES } = require("./roles");

const ORDER_STATUS = Object.freeze({
  BOOKED: "BOOKED",
  PICKUP_ASSIGNED: "PICKUP_ASSIGNED",
  PICKED_UP: "PICKED_UP",
  RECEIVED_AT_FACILITY: "RECEIVED_AT_FACILITY",
  INSPECTION: "INSPECTION",
  WASHING: "WASHING",
  DRYING: "DRYING",
  IRONING: "IRONING",
  QUALITY_CHECK: "QUALITY_CHECK",
  READY_FOR_DELIVERY: "READY_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
});

const S = ORDER_STATUS;
const { ADMIN, FACILITY_STAFF, DRIVER, CUSTOMER, SYSTEM } = ROLES;

/**
 * from -> { to: [roles allowed to make this transition] }
 * ADMIN is implicitly allowed everywhere (checked in validateTransition).
 */
const TRANSITIONS = {
  [S.BOOKED]: {
    [S.PICKUP_ASSIGNED]: [SYSTEM],
    [S.CANCELLED]: [CUSTOMER],
  },
  [S.PICKUP_ASSIGNED]: {
    [S.PICKED_UP]: [DRIVER],
    [S.CANCELLED]: [CUSTOMER],
  },
  [S.PICKED_UP]: {
    [S.RECEIVED_AT_FACILITY]: [FACILITY_STAFF],
  },
  [S.RECEIVED_AT_FACILITY]: {
    [S.INSPECTION]: [FACILITY_STAFF],
  },
  [S.INSPECTION]: {
    [S.WASHING]: [FACILITY_STAFF],
  },
  [S.WASHING]: {
    [S.DRYING]: [FACILITY_STAFF],
  },
  [S.DRYING]: {
    [S.IRONING]: [FACILITY_STAFF],
    [S.QUALITY_CHECK]: [FACILITY_STAFF], // fold-only orders skip ironing
  },
  [S.IRONING]: {
    [S.QUALITY_CHECK]: [FACILITY_STAFF],
  },
  [S.QUALITY_CHECK]: {
    [S.READY_FOR_DELIVERY]: [FACILITY_STAFF],
    [S.WASHING]: [FACILITY_STAFF], // re-wash on QC failure
  },
  [S.READY_FOR_DELIVERY]: {
    [S.OUT_FOR_DELIVERY]: [DRIVER],
  },
  [S.OUT_FOR_DELIVERY]: {
    [S.DELIVERED]: [DRIVER],
    [S.READY_FOR_DELIVERY]: [DRIVER], // failed delivery attempt
  },
  [S.DELIVERED]: {},
  [S.CANCELLED]: {},
};

/**
 * Customer cancellation policy — keep configurable.
 * fee: flat cancellation fee in ₹
 */
const CANCELLATION_RULES = {
  [S.BOOKED]: { allowed: true, fee: 0 },
  [S.PICKUP_ASSIGNED]: { allowed: true, fee: 0 },
  [S.PICKED_UP]: { allowed: false, fee: 0 }, // set allowed:true + fee to enable
};

/** Statuses considered "active" for the customer order list filter */
const ACTIVE_STATUSES = Object.values(S).filter(
  (s) => ![S.DELIVERED, S.CANCELLED].includes(s)
);

module.exports = { ORDER_STATUS, TRANSITIONS, CANCELLATION_RULES, ACTIVE_STATUSES };
