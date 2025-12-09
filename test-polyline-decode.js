// Quick test to decode the polyline and see what coordinates it contains

const polyline = "si}qBox`{QuAY`@bF{HpLsAlGcZ_DvQlu@_@pKtDb@?~CqH`DNxByFiAiOxLsAyC{BrCc@nJ`AzA_AtBjA~AhEjOyFlEKjS_FjEaAbF`FhJiD`D~@lAGfO{@rEj@rH_AvBpDbIi@lDfBjHcCzHcHbJNvHiBzGtJdMu@tFpA`F{@dGzAjA[xJvDhCj@|Be@fB_EqAuF~ArIrH~AzOxC`Hr@dHyDbGgHhD{@yB~BeD_ElBqDeAkDrBaAfBqEyAqE_Fs@hE|CnBu@pElBlA{GlCiF_B_@tAlKhFsBtJv@`AfDgAu@nCzB|@gFhFdD~AzAxHzIvDnBq@WpDbG|DnDVhAlBv@vDkDvN|DNrCfDeA\\\\HlA`Cf@e@tDeGtCfHu@cBz@ClB|A`@xBnEu@nBf@bAjC`CcEPxAp@aE|@gEeAzCpE_Cq@uBbHgBmBoCbGg@_GiEZ\\\\zBcF`BaBhFwAiAeB~@gBaE_IkA?`A_A{@LcByCfDPeJeCq@yB\\\\f@|CmAdCsCwAcHrJoMbAkDtB{BgBs@xCaF~B{IuDuJWkE}Be@aFcCsAaClA_CaBaJrE{@tD`ApBErFkAERrAwFu@QcD_BiAcGc@hChCIlAwFdAkIbHlE~DwC~De@~E~CxAz@uC|CjA}@nGf@fCnANtDcDV|FjCYkCnB`BBuAjBbBOaA`BdAHqBhEfE~APbI_AfDzF^tAzBnFv@cFdDbBs@tG~B?oBvCeFrKdDuDfBl@lAvHgBnF~ApMoAdJh@xM}Bp@mDvJyLdK[|A|@|CkDlHkBmAuD_FyDrC_DbIoAjHmFjT{AlXsPnP~AUcBbC{DiDcDByApEgFdD_H}EmDbGqCvEE~DoE~@vClAL|EaCnCj@FmClDdArGe@pB{CWmE`EuN~HeFzCbAjBwHq@eFzG\\\\rFkAvEyEnE~BbC{D}Bt@cDyHa@eCvDk@rA}CiBSkCiEqEkRuP~G{HXgAsBz@gJ{CyAoCgKqGaCqFuPuMsA`@`C{DbJe@hEoNwNcCN~@tN}@jAeGkFmHpBl@{E_CnDcAiAkBhA[iCeFoEoCP`@mDjBKZcCQoHdQ{AlBlB`EV~GyEbBwDfIuD|FkAt@mZnBwFa@aF~DwFfGyFiHiAeD~D_Ao@sEzAsApH{G`DSmJcHeHrAuE_A_@E}E}DoCpQsPHaGpGiFnGmQ`Fq@jGgFBsGjHoF`CwD|CsHlC_J\\\\mKzI_CfD_J|BeAuByGp@aDeCsEQeH}B_FgFn@yKoEmFuGm\\\\gJbF{H{AwIhAiCwLjCsHaAyEaRoJgAZuKeQis@dQ~BzBy@q@WrEf@dAsFpIuMg@uE~CdAX~FrAF";

function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lon = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlon = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lon += dlon;

    points.push([lat / 1e5, lon / 1e5]);
  }

  return points;
}

const points = decodePolyline(polyline);
console.log(`Decoded ${points.length} points`);
console.log('First point (start):', points[0]);
console.log('Midpoint:', points[Math.floor(points.length / 2)]);
console.log('Last point (end):', points[points.length - 1]);

// Check if these are Chiangmai coordinates (should be around 18.8°N, 98.9°E)
const [firstLat, firstLon] = points[0];
if (firstLat >= 18 && firstLat <= 19 && firstLon >= 98 && firstLon <= 100) {
  console.log('✓ Coordinates look like Chiangmai, Thailand');
} else {
  console.log('✗ Coordinates DO NOT look like Chiangmai!');
  console.log(`  Expected: ~18.8°N, ~98.9°E`);
  console.log(`  Got: ${firstLat.toFixed(4)}°N, ${firstLon.toFixed(4)}°E`);
}
