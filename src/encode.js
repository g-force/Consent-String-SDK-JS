const {
  encodeToBase64,
  padRight,
} = require('./utils/bits');

/**
 * Encode a list of vendor IDs into bits
 *
 * @param {integer} maxVendorId Highest vendor ID in the vendor list
 * @param {integer[]} allowedVendorIds Vendors that the user has given consent to
 */
function encodeVendorIdsToBits(maxVendorId, allowedVendorIds = []) {
  let vendorString = '';

  for (let id = 1; id <= maxVendorId; id += 1) {
    vendorString += (allowedVendorIds.indexOf(id) !== -1 ? '1' : '0');
  }

  return padRight(vendorString, Math.max(0, maxVendorId - vendorString.length));
}

/**
 * Encode a list of purpose IDs into bits
 *
 * @param {*} purposes List of purposes from the vendor list
 * @param {*} allowedPurposeIds List of purpose IDs that the user has given consent to
 */
function encodePurposeIdsToBits(purposes, allowedPurposeIds = new Set()) {
  const maxPurposeId = Math.max(
    0,
    ...purposes.map(({ id }) => id),
    ...Array.from(allowedPurposeIds),
  );

  let purposeString = '';

  for (let id = 1; id <= maxPurposeId; id += 1) {
    purposeString += (allowedPurposeIds.indexOf(id) !== -1 ? '1' : '0');
  }

  return purposeString;
}

/**
 * Convert a list of vendor IDs to ranges
 *
 * @param {object[]} vendors List of vendors from the vendor list
 * @param {integer[]} allowedVendorIds List of vendor IDs that the user has given consent to
 */
function convertVendorsToRanges(vendors, allowedVendorIds) {
  let range = [];

  return vendors.reduce((acc, { id }, index) => {
    if (allowedVendorIds.indexOf(id) !== -1) {
      range.push(id);
    }

    // If the range has ended or at the end of vendors add entry to the list
    if ((allowedVendorIds.indexOf(id) === -1 || index === vendors.length - 1) && range.length) {
      const startVendorId = range.shift();
      const endVendorId = range.pop();

      range = [];

      return [...acc, {
        isRange: typeof endVendorId === 'number',
        startVendorId,
        endVendorId,
      }];
    }

    return acc;
  }, []);
}

/**
 * Encode consent data into a web-safe base64-encoded string
 *
 * @param {object} consentData Data to include in the string (see `utils/definitions.js` for the list of fields)
 */
function encodeConsentString(consentData) {
  let { maxVendorId } = consentData;
  const { vendorList = {}, allowedPurposeIds, allowedVendorIds } = consentData;
  const { vendors = [], purposes = [] } = vendorList;

  if (!maxVendorId) {
    // Find the max vendor ID from the vendor list if it has not been provided
    maxVendorId = 0;

    vendors.forEach((vendor) => {
      if (vendor.id > maxVendorId) {
        maxVendorId = vendor.id;
      }
    });
  }

  // Encode the data with and without ranges and return the smallest encoded payload
  const noRangesData = encodeToBase64({
    ...consentData,
    maxVendorId,
    purposeIdBitString: encodePurposeIdsToBits(purposes, allowedPurposeIds),
    isRange: false,
    vendorIdBitString: encodeVendorIdsToBits(maxVendorId, allowedVendorIds),
  });

  const vendorRangeList = convertVendorsToRanges(vendors, allowedVendorIds);
  const rangesData = encodeToBase64({
    ...consentData,
    maxVendorId,
    purposeIdBitString: encodePurposeIdsToBits(purposes, allowedPurposeIds),
    isRange: true,
    defaultConsent: false,
    numEntries: vendorRangeList.length,
    vendorRangeList,
  });

  return noRangesData.length < rangesData.length ? noRangesData : rangesData;
}

module.exports = {
  encodeConsentString,
};
