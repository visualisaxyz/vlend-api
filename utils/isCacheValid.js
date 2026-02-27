 const isCacheValid = (
     cacheTime,
     maxCacheTime
 ) => {
     const currentTime = new Date().getTime();
     const timeDifference = currentTime - cacheTime;
     return timeDifference <= maxCacheTime;
 };

 module.exports = isCacheValid