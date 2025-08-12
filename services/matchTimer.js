// services/matchTimer.js
function startMatchTimer({ duration = 90, onTick, onEnd }) {
  let matchTime = 0;
  let status = 'LIVE';

  const interval = setInterval(async () => {
    if (status !== 'LIVE') return;

    matchTime++;

    if (onTick) {
      try {
        await onTick(matchTime);
      } catch (err) {
        console.error(`❌ Timer tick error at ${matchTime}':`, err.message);
      }
    }

    if (matchTime >= duration) {
      status = 'ENDED';
      clearInterval(interval);

      if (onEnd) {
        try {
          await onEnd();
        } catch (err) {
          console.error(`❌ Timer end error:`, err.message);
        }
      }
    }
  }, 1000);

  return {
    stop: () => {
      status = 'ENDED';
      clearInterval(interval);
    },
    getStatus: () => status,
    getTime: () => matchTime
  };
}

module.exports = { startMatchTimer };