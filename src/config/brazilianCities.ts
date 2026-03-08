/**
 * Brazilian cities organized by state (UF).
 * Includes all state capitals and major cities where events are likely held.
 * Cities are sorted alphabetically within each state.
 */
export const BRAZILIAN_CITIES: Record<string, string[]> = {
  AC: ['Cruzeiro do Sul', 'Rio Branco'],
  AL: ['Arapiraca', 'Maceió'],
  AM: ['Manaus', 'Parintins'],
  AP: ['Macapá', 'Santana'],
  BA: ['Camaçari', 'Feira de Santana', 'Ilhéus', 'Itabuna', 'Juazeiro', 'Lauro de Freitas', 'Porto Seguro', 'Salvador', 'Vitória da Conquista'],
  CE: ['Caucaia', 'Fortaleza', 'Juazeiro do Norte', 'Maracanaú', 'Sobral'],
  DF: ['Brasília'],
  ES: ['Cariacica', 'Guarapari', 'Linhares', 'Serra', 'Vila Velha', 'Vitória'],
  GO: ['Águas Claras', 'Anápolis', 'Aparecida de Goiânia', 'Goiânia', 'Luziânia', 'Rio Verde', 'Valparaíso de Goiás'],
  MA: ['Imperatriz', 'São José de Ribamar', 'São Luís', 'Timon'],
  MG: ['Belo Horizonte', 'Betim', 'Contagem', 'Divinópolis', 'Governador Valadares', 'Ipatinga', 'Juiz de Fora', 'Montes Claros', 'Nova Lima', 'Poços de Caldas', 'Ribeirão das Neves', 'Santa Luzia', 'Sete Lagoas', 'Uberaba', 'Uberlândia'],
  MS: ['Campo Grande', 'Dourados', 'Três Lagoas'],
  MT: ['Cuiabá', 'Rondonópolis', 'Sinop', 'Várzea Grande'],
  PA: ['Ananindeua', 'Belém', 'Marabá', 'Santarém'],
  PB: ['Campina Grande', 'João Pessoa', 'Santa Rita'],
  PE: ['Caruaru', 'Jaboatão dos Guararapes', 'Olinda', 'Paulista', 'Petrolina', 'Recife'],
  PI: ['Parnaíba', 'Teresina'],
  PR: ['Cascavel', 'Colombo', 'Curitiba', 'Foz do Iguaçu', 'Guarapuava', 'Londrina', 'Maringá', 'Paranaguá', 'Ponta Grossa', 'São José dos Pinhais', 'Toledo', 'Umuarama'],
  RJ: ['Angra dos Reis', 'Barra Mansa', 'Belford Roxo', 'Cabo Frio', 'Campos dos Goytacazes', 'Duque de Caxias', 'Itaboraí', 'Macaé', 'Magé', 'Maricá', 'Mesquita', 'Niterói', 'Nova Friburgo', 'Nova Iguaçu', 'Petrópolis', 'Resende', 'Rio de Janeiro', 'São Gonçalo', 'São João de Meriti', 'Teresópolis', 'Volta Redonda'],
  RN: ['Mossoró', 'Natal', 'Parnamirim'],
  RO: ['Ji-Paraná', 'Porto Velho'],
  RR: ['Boa Vista'],
  RS: ['Canoas', 'Caxias do Sul', 'Gravataí', 'Novo Hamburgo', 'Passo Fundo', 'Pelotas', 'Porto Alegre', 'Rio Grande', 'Santa Cruz do Sul', 'Santa Maria', 'São Leopoldo', 'Viamão'],
  SC: ['Balneário Camboriú', 'Blumenau', 'Chapecó', 'Criciúma', 'Florianópolis', 'Itajaí', 'Jaraguá do Sul', 'Joinville', 'Lages', 'Palhoça', 'São José'],
  SE: ['Aracaju', 'Nossa Senhora do Socorro'],
  SP: ['Americana', 'Araçatuba', 'Araraquara', 'Atibaia', 'Barueri', 'Bauru', 'Botucatu', 'Bragança Paulista', 'Campinas', 'Carapicuíba', 'Cotia', 'Diadema', 'Embu das Artes', 'Franca', 'Guarujá', 'Guarulhos', 'Hortolândia', 'Indaiatuba', 'Itanhaém', 'Itapevi', 'Itu', 'Jacareí', 'Jundiaí', 'Limeira', 'Marília', 'Mauá', 'Mogi das Cruzes', 'Osasco', 'Paulínia', 'Piracicaba', 'Praia Grande', 'Presidente Prudente', 'Ribeirão Preto', 'Rio Claro', 'Santo André', 'Santos', 'São Bernardo do Campo', 'São Caetano do Sul', 'São Carlos', 'São José do Rio Preto', 'São José dos Campos', 'São Paulo', 'São Vicente', 'Sorocaba', 'Sumaré', 'Suzano', 'Taboão da Serra', 'Taubaté', 'Valinhos', 'Vinhedo'],
  TO: ['Palmas'],
};

/** Flat list of all cities with their state, sorted alphabetically */
export function getAllCitiesWithState(): { city: string; state: string; label: string }[] {
  const result: { city: string; state: string; label: string }[] = [];
  for (const [state, cities] of Object.entries(BRAZILIAN_CITIES)) {
    for (const city of cities) {
      result.push({ city, state, label: `${city} - ${state}` });
    }
  }
  return result.sort((a, b) => a.city.localeCompare(b.city, 'pt-BR'));
}

/** Get cities for a specific state */
export function getCitiesByState(state: string): string[] {
  return BRAZILIAN_CITIES[state] || [];
}
