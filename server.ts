import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
dotenv.config();
// Força o Node a ignorar certificados "falsos" de redes corporativas
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Inicia o Express e o Prisma
const app = express();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL não definido. Configure no .env ou nas variáveis de ambiente.');
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

// Avisa o Express que ele vai receber dados no formato JSON (vindo do app mobile)
app.use(express.json());

// Captura erro de JSON inválido no corpo e retorna mensagem amigável
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  next(err);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ===== CRUD DE USUÁRIOS =====

// CREATE - Cadastrar novo usuário
app.post('/usuarios', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;


    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: "Por favor, preencha todos os campos (nome, email, senha)!" });
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ erro: "Email inválido!" });
    }

    // Validação de senha (mínimo 10 caracteres)
    if (senha.length < 10) {
      return res.status(400).json({ erro: "A senha deve ter no mínimo 10 caracteres!" });
    }

    // Criptografa a senha com bcrypt antes de salvar
    const senhaHash = await bcrypt.hash(senha, 10);

    const novoUsuario = await prisma.usuarios.create({
      data: {
        nome,
        email,
        senha: senhaHash
      }
    });

    return res.status(201).json({
      mensagem: "Usuário cadastrado com sucesso!",
      usuario: novoUsuario
    });

  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ erro: "Esse email já está em uso." });
    }
    
    console.error("ERRO NO CADASTRO:", error);
    return res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

// READ - Listar todos os usuários
app.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await prisma.usuarios.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.status(200).json({
      total: usuarios.length,
      usuarios
    });

  } catch (error: any) {
    console.error("ERRO AO LISTAR USUÁRIOS:", error);
    return res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

// READ - Obter usuário específico por ID
app.get('/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ erro: "ID do usuário é obrigatório!" });
    }

    const usuario = await prisma.usuarios.findUnique({
      where: { id },
      include: {
        despesas: true,
        metas: true
      }
    });

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado!" });
    }

    return res.status(200).json(usuario);

  } catch (error: any) {
    console.error("ERRO AO BUSCAR USUÁRIO:", error);
    return res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

// UPDATE - Atualizar usuário existente
app.put('/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, senha } = req.body;

    if (!id) {
      return res.status(400).json({ erro: "ID do usuário é obrigatório!" });
    }

    // Verifica se o usuário existe
    const usuarioExistente = await prisma.usuarios.findUnique({
      where: { id }
    });

    if (!usuarioExistente) {
      return res.status(404).json({ erro: "Usuário não encontrado!" });
    }

    // Validações dos campos fornecidos
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ erro: "Email inválido!" });
      }
    }

    if (senha && senha.length < 10) {
      return res.status(400).json({ erro: "A senha deve ter no mínimo 10 caracteres!" });
    }

    // Monta objeto com apenas os campos fornecidos
    const updateData: any = {};
    if (nome) updateData.nome = nome;
    if (email) updateData.email = email;
    if (senha) {
      const senhaHash = await bcrypt.hash(senha, 10);
      updateData.senha = senhaHash;
    }

    const usuarioAtualizado = await prisma.usuarios.update({
      where: { id },
      data: updateData
    });

    return res.status(200).json({
      mensagem: "Usuário atualizado com sucesso!",
      usuario: usuarioAtualizado
    });

  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ erro: "Esse email já está em uso." });
    }
    
    console.error("ERRO AO ATUALIZAR USUÁRIO:", error);
    return res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

// DELETE - Deletar usuário
app.delete('/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ erro: "ID do usuário é obrigatório!" });
    }

    // Verifica se o usuário existe
    const usuarioExistente = await prisma.usuarios.findUnique({
      where: { id }
    });

    if (!usuarioExistente) {
      return res.status(404).json({ erro: "Usuário não encontrado!" });
    }

    await prisma.usuarios.delete({
      where: { id }
    });

    return res.status(200).json({ mensagem: "Usuário deletado com sucesso!" });

  } catch (error: any) {
    console.error("ERRO AO DELETAR USUÁRIO:", error);
    return res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

// AUTH - Login de usuário
app.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });
    }

    const usuario = await prisma.usuarios.findUnique({
      where: { email },
      select: {
        id: true,
        nome: true,
        email: true,
        senha: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!usuario) {
      return res.status(401).json({ erro: 'Email ou senha inválidos.' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Email ou senha inválidos.' });
    }

    const usuarioResp = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      createdAt: usuario.createdAt,
      updatedAt: usuario.updatedAt
    };

    return res.status(200).json({ mensagem: 'Login realizado com sucesso!', usuario: usuarioResp });

  } catch (error: any) {
    console.error('ERRO NA AUTENTICAÇÃO:', error);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
});

// AUTH - Logout de usuário
app.post('/logout', (req, res) => {
  // Numa implementação de sessions/token, aqui limparíamos o token de acesso.
  // Atualmente a API é stateless e o cliente deve descartar o token/localStorage.
  return res.status(200).json({ mensagem: 'Logout realizado com sucesso!' });
});

// ===== CRUD DE DESPESAS =====

// CREATE - Cadastrar nova despesa
app.post('/despesas', async (req, res) => {
  try {
    const { titulo, valor, data, usuarioId } = req.body;

    if (!titulo || valor === undefined || !data || !usuarioId) {
      return res.status(400).json({ erro: "Por favor, preencha todos os campos (titulo, valor, data, usuarioId)!" });
    }

    if (typeof valor !== 'number' && typeof valor !== 'string') {
      return res.status(400).json({ erro: "Valor inválido. Use número ou string numérica." });
    }

    const valorNumber = Number(valor);
    if (Number.isNaN(valorNumber) || valorNumber <= 0) {
      return res.status(400).json({ erro: "Valor deve ser um número positivo." });
    }

    const dataDate = new Date(data);
    if (Number.isNaN(dataDate.getTime())) {
      return res.status(400).json({ erro: "Data inválida. Use formato ISO ou data válida." });
    }

    const usuario = await prisma.usuarios.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      return res.status(404).json({ erro: "Usuário associado não encontrado." });
    }

    const novaDespesa = await prisma.despesas.create({
      data: {
        titulo,
        valor: valorNumber,
        data: dataDate,
        usuarioId
      }
    });

    return res.status(201).json({
      mensagem: "Despesa cadastrada com sucesso!",
      despesa: novaDespesa
    });

  } catch (error: any) {
    console.error("ERRO NO CADASTRO DE DESPESA:", error);
    return res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

// READ - Listar todas as despesas
app.get('/despesas', async (req, res) => {
  try {
    const despesas = await prisma.despesas.findMany({
      include: {
        usuario: {
          select: { id: true, nome: true, email: true }
        }
      }
    });

    return res.status(200).json({
      total: despesas.length,
      despesas
    });

  } catch (error: any) {
    console.error("ERRO AO LISTAR DESPESAS:", error);
    return res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

// READ - Obter despesa específica por ID
app.get('/despesas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ erro: "ID da despesa é obrigatório!" });
    }

    const despesa = await prisma.despesas.findUnique({
      where: { id },
      include: {
        usuario: {
          select: { id: true, nome: true, email: true }
        }
      }
    });

    if (!despesa) {
      return res.status(404).json({ erro: "Despesa não encontrada!" });
    }

    return res.status(200).json(despesa);

  } catch (error: any) {
    console.error("ERRO AO BUSCAR DESPESA:", error);
    return res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

// UPDATE - Atualizar despesa existente
app.put('/despesas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, valor, data, usuarioId } = req.body;

    if (!id) {
      return res.status(400).json({ erro: "ID da despesa é obrigatório!" });
    }

    const despesaExistente = await prisma.despesas.findUnique({ where: { id } });
    if (!despesaExistente) {
      return res.status(404).json({ erro: "Despesa não encontrada!" });
    }

    const updateData: any = {};

    if (titulo) updateData.titulo = titulo;

    if (valor !== undefined) {
      const valorNumber = Number(valor);
      if (Number.isNaN(valorNumber) || valorNumber <= 0) {
        return res.status(400).json({ erro: "Valor deve ser um número positivo." });
      }
      updateData.valor = valorNumber;
    }

    if (data) {
      const dataDate = new Date(data);
      if (Number.isNaN(dataDate.getTime())) {
        return res.status(400).json({ erro: "Data inválida. Use formato ISO ou data válida." });
      }
      updateData.data = dataDate;
    }

    if (usuarioId) {
      const usuario = await prisma.usuarios.findUnique({ where: { id: usuarioId } });
      if (!usuario) {
        return res.status(404).json({ erro: "Usuário associado não encontrado." });
      }
      updateData.usuarioId = usuarioId;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ erro: "Nenhum campo válido para atualizar." });
    }

    const despesaAtualizada = await prisma.despesas.update({
      where: { id },
      data: updateData
    });

    return res.status(200).json({
      mensagem: "Despesa atualizada com sucesso!",
      despesa: despesaAtualizada
    });

  } catch (error: any) {
    console.error("ERRO AO ATUALIZAR DESPESA:", error);
    return res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

// DELETE - Deletar despesa
app.delete('/despesas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ erro: "ID da despesa é obrigatório!" });
    }

    const despesaExistente = await prisma.despesas.findUnique({ where: { id } });
    if (!despesaExistente) {
      return res.status(404).json({ erro: "Despesa não encontrada!" });
    }

    await prisma.despesas.delete({ where: { id } });

    return res.status(200).json({ mensagem: "Despesa deletada com sucesso!" });

  } catch (error: any) {
    console.error("ERRO AO DELETAR DESPESA:", error);
    return res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

app.listen(3333, () => {
  console.log("🚀 Servidor do Aurum rodando na porta 3333!");
});