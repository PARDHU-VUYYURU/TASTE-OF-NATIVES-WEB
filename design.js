(() => {
  const STORAGE_KEY = "product-studio-orders-v1";
  const orderList = document.getElementById("orders-list");
  const orderCount = document.getElementById("order-count");
  const errorLabel = document.getElementById("orders-error");
  const statuses = ["New", "Confirmed", "Ignored", "Processing", "Shipped", "Completed"];

  function loadOrders() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed)) throw new Error("Saved order data is not an order list.");
      return parsed.filter((order) =>
        order && typeof order.id === "string" &&
        typeof order.createdAt === "string" &&
        order.customer && typeof order.customer.name === "string" &&
        Array.isArray(order.items)
      );
    } catch (error) {
      console.error("Could not load customer orders.", error);
      errorLabel.textContent = "Orders could not be loaded from this browser.";
      errorLabel.hidden = false;
      return null;
    }
  }

  function formatPrice(price) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(price));
  }

  function addText(parent, tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }

  function createOrderCard(order) {
    const card = document.createElement("article");
    card.className = "order-card";

    const header = document.createElement("div");
    header.className = "order-card-heading";
    const identity = document.createElement("div");
    addText(identity, "h3", "order-number", `Order ${order.id.slice(0, 8)}`);
    addText(identity, "p", "order-reference", `Customer reference: ${order.reference || order.id.slice(0, 8)}`);
    addText(identity, "p", "order-date", new Date(order.createdAt).toLocaleString());
    const statusLabel = document.createElement("label");
    statusLabel.className = "order-status-label";
    statusLabel.textContent = "Status";
    const statusSelect = document.createElement("select");
    statusSelect.className = "order-status";
    statusSelect.setAttribute("aria-label", `Status for order ${order.id.slice(0, 8)}`);
    for (const status of statuses) {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      statusSelect.appendChild(option);
    }
    statusSelect.value = statuses.includes(order.status) ? order.status : "New";
    let currentStatus = statusSelect.value;
    statusLabel.appendChild(statusSelect);
    const decisions = document.createElement("div");
    decisions.className = "order-decisions";
    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = "order-decision confirm-order";
    confirmButton.textContent = "Confirm order";
    confirmButton.disabled = currentStatus === "Confirmed";
    const ignoreButton = document.createElement("button");
    ignoreButton.type = "button";
    ignoreButton.className = "order-decision ignore-order";
    ignoreButton.textContent = "Ignore order";
    ignoreButton.disabled = currentStatus === "Ignored";
    decisions.append(confirmButton, ignoreButton);
    header.append(identity, decisions, statusLabel);

    const body = document.createElement("div");
    body.className = "order-card-body";
    const customer = document.createElement("section");
    customer.className = "order-customer";
    addText(customer, "h4", "", order.customer.name);
    addText(customer, "p", "", order.customer.phone);
    const addressParts = [
      order.customer.streetAddress,
      order.customer.town,
      order.customer.district,
      order.customer.state,
      order.customer.postalCode
    ].filter((part) => typeof part === "string" && part.trim());
    addText(customer, "p", "order-address", addressParts.join(", "));

    const items = document.createElement("ul");
    items.className = "order-items";
    for (const item of order.items) {
      if (!item || typeof item.name !== "string") continue;
      addText(items, "li", "", `${item.name} × ${Number(item.quantity) || 0} — ${formatPrice(item.price)}`);
    }
    body.append(customer, items);
    const total = addText(card, "p", "order-total", `Total: ${formatPrice(order.total)}`);
    card.append(header, body, total);

    function updateStatus(nextStatus) {
      const orders = loadOrders();
      if (!orders) return;
      const updatedOrders = orders.map((savedOrder) =>
        savedOrder.id === order.id ? { ...savedOrder, status: nextStatus } : savedOrder
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
        currentStatus = nextStatus;
        errorLabel.hidden = true;
        renderOrders();
      } catch (error) {
        console.error("Could not update order status.", error);
        errorLabel.textContent = "The order status could not be saved.";
        errorLabel.hidden = false;
        statusSelect.value = currentStatus;
      }
    }

    confirmButton.addEventListener("click", () => updateStatus("Confirmed"));
    ignoreButton.addEventListener("click", () => updateStatus("Ignored"));
    statusSelect.addEventListener("change", () => updateStatus(statusSelect.value));
    return card;
  }

  function renderOrders() {
    const orders = loadOrders();
    orderList.replaceChildren();
    if (!orders) {
      orderCount.textContent = "Orders unavailable";
      return;
    }
    errorLabel.hidden = true;
    orderCount.textContent = `${orders.length} ${orders.length === 1 ? "order" : "orders"}`;
    if (orders.length === 0) {
      const empty = document.createElement("div");
      empty.className = "orders-empty";
      addText(empty, "h3", "", "No customer orders yet");
      addText(empty, "p", "", "Orders placed from the storefront on this device will appear here.");
      orderList.appendChild(empty);
      return;
    }
    for (const order of orders) orderList.appendChild(createOrderCard(order));
  }

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY || event.key === null) renderOrders();
  });
  renderOrders();
})();
