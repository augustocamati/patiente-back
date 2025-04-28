import express, { Request, Response } from "express"
import { PrismaClient } from "@prisma/client"
import cors from "cors"

// Inicializar o Express e o Prisma
const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Tipo para os dados recebidos na criação de sinais vitais
interface CreateVitalSignBody {
  patientId: number
  spo2: number
  bpm: number
  temperature: number
}

app.get("/", (req: Request, res: Response) => {
  res.json({message:"API de Sinais Vitais em funcionamento!"})
})

// Rota para obter todos os registros de sinais vitais
app.get("/api/vitals", async (req: Request, res: Response) => {
  try {
    const vitals = await prisma.vitalSigns.findMany({
      orderBy: {
        timestamp: "desc",
      },
      take: 100, // Limitar a 100 registros mais recentes
    })
    res.json(vitals)
  } catch (error) {
    console.error("Erro ao buscar sinais vitais:", error)
    res.status(500).json({ error: "Falha ao buscar dados de sinais vitais" })
  }
})

// Rota para obter sinais vitais de um paciente específico
app.get(
  "/api/patients/:patientId/vitals",
  async (req: Request, res: Response) => {
    const { patientId } = req.params

    try {
      const vitals = await prisma.vitalSigns.findMany({
        where: {
          patientId: parseInt(patientId),
        },
        orderBy: {
          timestamp: "desc",
        },
        take: 50, // Últimos 50 registros
      })
      res.json(vitals)
    } catch (error) {
      console.error(
        `Erro ao buscar sinais vitais do paciente ${patientId}:`,
        error
      )
      res.status(500).json({ error: "Falha ao buscar dados do paciente" })
    }
  }
)

// Rota para registrar novos sinais vitais
app.post(
  "/api/vitals",
  async (req: Request<{}, {}, CreateVitalSignBody>, res: Response) => {
    const { patientId, spo2, bpm, temperature } = req.body

    if (!patientId || !spo2 || !bpm || !temperature) {
    throw new Error("Dados incompletos")
    } 

    try {
      const newVitalRecord = await prisma.vitalSigns.create({
        data: {
          patientId: patientId,
          spo2: spo2,
          bpm: bpm,
          temperature: temperature,
          timestamp: new Date(),
        },
      })

      res.status(201).json(newVitalRecord)
    } catch (error) {
      console.error("Erro ao registrar sinais vitais:", error)
      res.status(500).json({ error: "Falha ao registrar sinais vitais" })
    }
  }
)

// Rota para obter o último registro de sinais vitais de um paciente
app.get(
  "/api/patients/:patientId/vitals/latest",
  async (req: Request, res: Response) => {
    const { patientId } = req.params

    try {
      const latestVitals = await prisma.vitalSigns.findFirst({
        where: {
          patientId: parseInt(patientId),
        },
        orderBy: {
          timestamp: "desc",
        },
      })

      if (!latestVitals) {
      throw new Error("Nenhum registro encontrado")
      }

      res.json(latestVitals)
    } catch (error) {
      console.error(
        `Erro ao buscar último registro do paciente ${patientId}:`,
        error
      )
      res.status(500).json({ error: "Falha ao buscar último registro" })
    }
  }
)

// Rota para obter alertas (sinais vitais fora do normal)
app.get("/api/alerts", async (req: Request, res: Response) => {
  try {
    const alerts = await prisma.vitalSigns.findMany({
      where: {
        OR: [
          { spo2: { lt: 95 } },
          { bpm: { lt: 60 } },
          { bpm: { gt: 100 } },
          { temperature: { lt: 36 } },
          { temperature: { gt: 37.5 } },
        ],
      },
      orderBy: {
        timestamp: "desc",
      },
      include: {
        patient: true, // Incluir dados do paciente
      },
    })

    res.json(alerts)
  } catch (error) {
    console.error("Erro ao buscar alertas:", error)
    res.status(500).json({ error: "Falha ao buscar alertas" })
  }
})

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})

// Função para lidar com o encerramento do servidor
process.on("SIGINT", async () => {
  await prisma.$disconnect()
  console.log("Conexão com o banco de dados fechada")
  process.exit(0)
})
