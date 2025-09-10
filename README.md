# 🏥 ClinSys – Frontend Web

O ClinSys é um sistema de gestão para profissionais da saúde que precisam organizar pacientes, consultas e pagamentos.
Esta parte do projeto é dedicada ao Frontend Web, desenvolvido com HTML, CSS, JavaScript e Bootstrap 5, com integração direta à API construída em Java (Spring Boot).

O foco do frontend é fornecer uma interface simples, responsiva e intuitiva, permitindo que médicos, psicólogos, fisioterapeutas, nutricionistas e terapeutas gerenciem seus atendimentos de forma prática.

---

# 🚀 Funcionalidades do Frontend
- 📋 Listagem de pacientes com consumo da API REST
- ➕ Cadastro e edição de pacientes através de formulários modais
- 🗓️ Agendamento e gerenciamento de consultas (status pago/pendente)
- 🔐 Autenticação e login de usuários integrado ao backend (JWT)
- 📊 Dashboard administrativo com estatísticas básicas
- 📱 Design responsivo com Bootstrap 5, compatível com desktop e mobile

---

# 🔗 Integração com a API

O frontend consome os endpoints REST expostos pelo backend desenvolvido em Java + Spring Boot.
A comunicação é feita com Axios, enviando requisições HTTP (GET, POST, PUT, DELETE) para os recursos protegidos por autenticação JWT.

---

# 🛠️ Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript
- Bootstrap 5
- Axios (consumo da API backend)

---

# ▶️ Como rodar o projeto localmente

Clone o repositório:
git clone https://github.com/nbeverton/clinsys.git

Navegue até a pasta frontend:
cd clinsys/frontend

Abra o arquivo index.html em seu navegador ou utilize uma extensão de servidor local (como Live Server no VS Code).

Certifique-se de que o backend esteja rodando em http://localhost:8080 para que as integrações da API funcionem.


---
# 👨‍💻 Sobre o autor

Desenvolvido por Everton Barbosa – profissional em transição de carreira para tecnologia com foco em Java Backend e integração de sistemas web.
Atualmente construindo o ClinSys como projeto de portfólio e estudo prático de integração entre API e Frontend.

📧 nbeverton@gmail.com

📌 LinkedIn: linkedin.com/in/evertonbarbosa-dev
