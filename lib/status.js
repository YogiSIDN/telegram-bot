const os = require("os")
const v8 = require("v8")
const process = require("process")

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

function serverStatus() {
  const memoryUsage = process.memoryUsage()
  const heapStats = v8.getHeapStatistics()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const cpuLoad = os.loadavg()[0]
  const cpuUsage = process.cpuUsage()
  const cpus = os.cpus()
  let info = "[ SERVER INFORMATION ]\n\n"
  
  info += "*💡 Memory Usage:*\n"
  info += `RSS: ${formatBytes(memoryUsage.rss)}\n`
  info += `Heap Total: ${formatBytes(memoryUsage.heapTotal)}\n`
  info += `Heap Used: ${formatBytes(memoryUsage.heapUsed)}\n`
  info += `External Buffers: ${formatBytes(memoryUsage.external)}\n`
  info += `Heap Limit: ${formatBytes(heapStats.heap_size_limit)}\n`
  info += `Peak Malloc: ${formatBytes(heapStats.malloced_memory)}\n\n`

  info += "*💾 RAM & CPU:*\n"
  info += `Total RAM: ${formatBytes(totalMem)}\n`
  info += `RAM Digunakan: ${formatBytes(usedMem)}\n`
  info += `RAM Tersedia: ${formatBytes(freeMem)}\n`
  info += `CPU Load (1 min avg): ${cpuLoad.toFixed(2)}%\n`
  info += `Penggunaan CPU: User CPU: ${(cpuUsage.user / 1000).toFixed(2)} ms\n`
  info += `System CPU: ${(cpuUsage.system / 1000).toFixed(2)} ms\n\n`
  
  info += "*🖥️ Sistem & Perangkat:*\n"
  info += `Platform: ${os.platform().toUpperCase()} (${os.release()})\n`
  info += `Arsitektur CPU: ${os.arch()}\n`
  info += `CPU Model: ${cpus[0].model || "Unknown CPU Model"}\n`
  
  cpus.forEach((cpu, index) => {
    info += `\nCore ${index + 1}\n`
    info += `Model: ${cpu.model}\n`
    info += `Speed: ${cpu.speed} MHz\n`
    info += `User: ${cpu.times.user} ms\n`
    info += `Idle: ${cpu.times.idle} ms\n`
  })
  
  return info
}

module.exports = {
    serverStatus
}