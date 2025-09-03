export async function loadNavbar() {
  try {
    const response = await fetch("navbar.html");
    const html = await response.text();
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;

    // adiciona a navbar no topo do body
    document.body.prepend(wrapper);

    // garante logout funcionando
    import("./auth.js").then(({ logout }) => {
      const btn = document.getElementById("btnLogout");
      if (btn) btn.addEventListener("click", logout);
    });
  } catch (err) {
    console.error("Erro ao carregar navbar:", err);
  }
}