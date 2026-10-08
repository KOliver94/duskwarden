export const formatClock = (ms: number, round = Math.ceil) => {
  const total = round(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
