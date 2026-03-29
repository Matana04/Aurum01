import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as UsuarioModel from '../models/usuariosModel.js';

const ADMIN_ID = 'f4f299fb-c169-4a94-b6d7-f9a1564f1164';

const formatUsuarioSemSenha = (usuario: { id: string; nome: string; email: string; createdAt: Date; updatedAt: Date }) => ({
  id: usuario.id,
  nome: usuario.nome,
  email: usuario.email,
  createdAt: usuario.createdAt,
  updatedAt: usuario.updatedAt,
});

export const loginUsuario = async (req: Request, res: Response) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });
    }

    const usuario = await UsuarioModel.findUsuarioByEmail(email);
    if (!usuario) {
      return res.status(401).json({ erro: 'Email ou senha inválidos.' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Email ou senha inválidos.' });
    }

    return res.status(200).json({ mensagem: 'Login realizado com sucesso!', usuario: formatUsuarioSemSenha(usuario) });
  } catch (error) {
    console.error('ERRO NA AUTENTICAÇÃO:', error);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

export const logoutUsuario = (req: Request, res: Response) => {
  return res.status(200).json({ mensagem: 'Logout realizado com sucesso!' });
};

export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });
    }

    const admin = await UsuarioModel.findUsuarioByIdRaw(ADMIN_ID);
    if (!admin) {
      return res.status(401).json({ erro: 'Usuário admin não encontrado.' });
    }

    if (admin.email !== email || admin.nome !== 'Admin') {
      return res.status(401).json({ erro: 'Credenciais de admin inválidas.' });
    }

    const senhaValida = await bcrypt.compare(senha, admin.senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Credenciais de admin inválidas.' });
    }

    return res.status(200).json({ mensagem: 'Login admin realizado com sucesso!', usuario: formatUsuarioSemSenha(admin) });
  } catch (error) {
    console.error('ERRO NA AUTENTICAÇÃO ADMIN:', error);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};
