

module.exports = ({ agencyCode, year, cityName, personIndex }) => {
  const now = new Date();
  // const year = now.getFullYear().toString().slice(-2); // "25"
  const month = String(now.getMonth() + 1).padStart(2, '0'); // "08"

  const cityCode = cityName.slice(0, 3).toUpperCase(); // "Tehran" -> "TEH"
  const personCode = String(personIndex).padStart(3, '0'); // 5 -> "005"

  return `${year}${month}-${agencyCode}-${cityCode}-${personCode}`;
}