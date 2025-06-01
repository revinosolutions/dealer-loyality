declare module '../components/client/ClientInventoryDisplay' {
  const ClientInventoryDisplay: React.FC;
  export default ClientInventoryDisplay;
}

declare module '../services/clientInventoryApi' {
  interface ClientInventoryApi {
    getClientInventory: () => Promise<any>;
    getClientInventorySummary: () => Promise<any>;
    getClientInventoryHistory: () => Promise<any>;
    repairClientInventory: () => Promise<any>;
  }
  const clientInventoryApi: ClientInventoryApi;
  export default clientInventoryApi;
} 