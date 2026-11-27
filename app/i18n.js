/* Interface language. Follows the TV's menu language (navigator.language, with the
   Tizen locale as a fallback). English is the source and default; add more maps below. */
(function () {
  'use strict';
  function detect() {
    var lang = '';
    try { var nav = window.navigator || {}; lang = (nav.language || nav.userLanguage || '').toLowerCase(); } catch (e) { lang = ''; }
    if (!lang) {
      try {
        var sys = window.tizen && window.tizen.systeminfo;
        if (sys && typeof sys.getCapability === 'function') lang = String(sys.getCapability('http://tizen.org/system/platform.name') || '').toLowerCase();
      } catch (e2) { /* keep default */ }
    }
    if (lang.indexOf('pt') === 0) return 'pt';
    return 'en';
  }

  // English source -> Portuguese. A missing entry falls back to the English source.
  var PT = {
    'Samsung Home': 'Home Samsung', 'TV settings': 'Config. da TV', 'Art Mode': 'Modo Arte',
    'All apps': 'Todos os apps', 'Arrange': 'Organizar', 'Settings': 'Configurações',
    'Background': 'Plano de fundo', 'Layout': 'Layout', 'Typography': 'Tipografia', 'Focus': 'Foco',
    'Weather effects': 'Efeitos do tempo', 'Apps on Home': 'Apps na Home', 'Sort apps': 'Ordenar apps',
    'Samsung': 'Samsung', 'Home and TV settings': 'Home e configurações da TV',
    'Background type': 'Tipo de fundo', 'Wallpaper': 'Papel de parede', 'Rotation': 'Rotação',
    'App display': 'Exibição dos apps', 'Home controls': 'Controles', 'Focus style': 'Estilo de foco',
    'Material': 'Material', 'Inputs': 'Entradas', 'Apps': 'Apps', 'Font': 'Fonte',
    'Input icons': 'Ícones das entradas', 'Default': 'Padrão', 'No inputs found': 'Nenhuma entrada encontrada',
    'Choose a device icon for each input shown on the Home bar.': 'Escolha um ícone de dispositivo para cada entrada mostrada na barra da Home.',
    'Cable box': 'TV a cabo',
    'Custom order': 'Ordem personalizada', 'Name A–Z': 'Nome A–Z', 'Name Z–A': 'Nome Z–A',
    'Recently used': 'Uso recente', 'Least used': 'Menos usado', 'On': 'Ligado', 'Off': 'Desligado',
    'Dark': 'Escuro', 'Light': 'Claro', 'Photo': 'Foto', 'List': 'Lista', 'Dock': 'Dock',
    'Type': 'Texto', 'Glass': 'Vidro', 'Soft': 'Suave', 'Frost': 'Fosco', 'Clear tint': 'Tonalizado',
    'Icons': 'Ícones', 'Icons and text': 'Ícones e texto', 'Text': 'Texto', 'Both': 'Ambos',
    'Fixed': 'Fixo', 'Each time Home opens': 'Ao abrir a Home', 'Every 5 minutes': 'A cada 5 minutos',
    'Every 15 minutes': 'A cada 15 minutos', 'Every hour': 'A cada hora',
    'Clear': 'Céu limpo', 'Mainly clear': 'Predom. limpo', 'Partly cloudy': 'Parc. nublado',
    'Overcast': 'Encoberto', 'Fog': 'Neblina', 'Drizzle': 'Garoa', 'Rain': 'Chuva',
    'Showers': 'Pancadas', 'Snow': 'Neve', 'Thunderstorm': 'Tempestade', 'Cloudy': 'Nublado',
    'Remote Access': 'Acesso Remoto', 'Connection Guide': 'Guia de Conexão', 'PC and cloud': 'PC e nuvem',
    'Setup help': 'Ajuda de config.', 'TV': 'TV', 'Live TV': 'TV ao vivo',
    'Active': 'Ativa', 'Connected': 'Conectada', 'Not connected': 'Desconectada',
    'Disconnected — may be asleep': 'Desconectada — pode estar em espera',
    'Loading inputs…': 'Carregando entradas…', 'Try again': 'Tentar de novo',
    'No HDMI inputs were reported by this TV.': 'Esta TV não informou entradas HDMI.',
    'Open Samsung’s Home screen': 'Abrir a Home da Samsung',
    'Picture, sound and network settings': 'Imagem, som e rede', 'Choose an HDMI input': 'Escolher uma entrada HDMI',
    'Choose Photo to use wallpaper and rotation.': 'Escolha Foto para usar papel de parede e rotação.',
    'Reorders the apps on Home. Dragging an app in Apps on Home switches back to Custom order.': 'Reordena os apps na Home. Arrastar um app em Apps na Home volta para Ordem personalizada.',
    'Animated effects follow the reduced-motion setting.': 'Os efeitos animados seguem a configuração de movimento reduzido.',
    'Rain, storms, sun, stars and falling leaves follow the local weather.': 'Chuva, tempestades, sol, estrelas e folhas caindo seguem o tempo local.',
    'Materials are available with a Photo background.': 'Os materiais ficam disponíveis com fundo de Foto.',
    'Choose Glass focus or the Dock layout to use materials.': 'Escolha foco Vidro ou o layout Dock para usar materiais.',
    'Choose Photo in Background to use rotation.': 'Escolha Foto no Plano de fundo para usar rotação.',
    'Timed changes pause while Settings or another panel is open.': 'As trocas por tempo pausam enquanto as Configurações ou outro painel estão abertos.',
    'Leave Home?': 'Sair da Home?', 'Open Samsung Home?': 'Abrir a Home da Samsung?',
    'Stay': 'Ficar', 'Back': 'Voltar', 'The TV could not open this screen.': 'A TV não conseguiu abrir esta tela.',
    'Couldn’t save. Nothing changed.': 'Não foi possível salvar. Nada mudou.',
    'Not saved. OK tries again.': 'Não salvo. OK tenta de novo.',
    'Loading installed apps…': 'Carregando apps instalados…', 'On Home': 'Na Home',
    'Remove from Home': 'Remover da Home', 'Add to Home': 'Adicionar à Home', 'Home is full': 'Home cheia',
    'Add app': 'Adicionar app', 'Recently removed': 'Removidos recentemente',
    'Other installed apps': 'Outros apps instalados', 'Undo': 'Desfazer', 'Done': 'Concluir',
    'Nothing to undo': 'Nada para desfazer', 'Then scroll': 'Depois role',
    'Home is full. Remove an app first.': 'Home cheia. Remova um app primeiro.',
    'Home needs one app': 'A Home precisa de um app',
    'Apply selected setting': 'Aplicar opção selecionada', 'Open selected group': 'Abrir grupo selecionado',
    'Open on the TV': 'Abrir na TV', 'Retry this change': 'Tentar esta alteração de novo',
    'Choose a wallpaper': 'Escolher um papel de parede', 'Choose a rotation interval': 'Escolher um intervalo de rotação',
    'Add apps': 'Adicionar apps', 'No apps on Home': 'Nenhum app na Home',
    'No installed apps found.': 'Nenhum app instalado encontrado.', 'your choice': 'sua escolha',
    'Back cancels this change.': 'Voltar cancela esta alteração.',
    'Couldn’t save this change.': 'Não foi possível salvar esta alteração.',
    'Couldn’t load this appearance.': 'Não foi possível carregar esta aparência.',
    'Your current choice is kept.': 'Sua escolha atual foi mantida.',
    'Applied': 'Aplicado', 'Preview': 'Prévia',
    'Retry this photo': 'Tentar esta foto de novo', 'Apply selected photo': 'Aplicar foto selecionada',
    'Loading {name}…': 'Carregando {name}…', 'Preparing {name}…': 'Preparando {name}…',
    'Applying {name}…': 'Aplicando {name}…', 'Couldn’t save {name}.': 'Não foi possível salvar {name}.',
    'Couldn’t load {name}.': 'Não foi possível carregar {name}.',
    'Return to {name}': 'Voltar para {name}', '{n} of {cap}': '{n} de {cap}',
    'Misty coast': 'Costa enevoada', 'Quiet cove': 'Enseada calma', 'Forest mist': 'Névoa na floresta',
    'Mountain valley': 'Vale da montanha', 'Desert stars': 'Estrelas no deserto', 'Blue peaks': 'Picos azuis',
    'Bridge at dusk': 'Ponte ao anoitecer', 'Sunlit ridges': 'Cristas ao sol', 'Golden hour': 'Hora dourada',
    'Sunlit summits': 'Cumes ao sol', 'Gold Coast dusk': 'Entardecer na Gold Coast', 'Sydney Harbour': 'Baía de Sydney',
    'Amber hills': 'Colinas âmbar', 'Mint wave': 'Onda menta', 'Alpine glow': 'Brilho alpino',
    'No photo yet': 'Sem foto ainda', 'The TV did not respond. Please try again.': 'A TV não respondeu. Tente de novo.',
    'Open the app on the TV to use this control.': 'Abra o app na TV para usar este controle.',
    'The web preview cannot control the TV.': 'A prévia no navegador não controla a TV.',
    'Try again, or press the remote’s Home button to return to the app.': 'Tente de novo, ou aperte o botão Home do controle para voltar ao app.',
    'This HDMI input is not available.': 'Esta entrada HDMI não está disponível.',
    'Input change cancelled.': 'Troca de entrada cancelada.',
    'This input is no longer available.': 'Esta entrada não está mais disponível.',
    'The TV selected a different input. Please try again.': 'A TV selecionou outra entrada. Tente de novo.',
    'The input was selected, but the TV viewer could not open.': 'A entrada foi selecionada, mas o visualizador da TV não abriu.',
    'Use the remote’s Source control to view the input.': 'Use o botão Source do controle para ver a entrada.',
    'This app has no launch target.': 'Este app não tem destino de abertura.',
    'This channel is not available.': 'Este canal não está disponível.',
    'Channel change cancelled.': 'Troca de canal cancelada.',
    'Edit Home apps': 'Editar apps da Home',
    'Edit Home channels': 'Editar canais da Home',
    'Channels on Home': 'Canais da Home',
    'Dock layout': 'Layout dos docks',
    'App dock': 'Dock de apps',
    'Channel dock': 'Dock de canais',
    'Left': 'Esquerda', 'Right': 'Direita', 'Center': 'Centro', 'Above': 'Acima', 'Below': 'Abaixo',
    'Controls': 'Controles',
    'Wi-Fi': 'Wi-Fi',
    'Diagnostics': 'Diagnóstico',
    'Theme': 'Tema',
    'HDMI and sources': 'HDMI e fontes',
    'Open selected control': 'Abrir o controle selecionado',
    'Reading…': 'Lendo…',
    '{name} added to Home.': '{name} adicionado à Home.',
    '{name} removed from Home.': '{name} removido da Home.',
    'OK adds or removes the app from Home.': 'OK adiciona ou remove o app da Home.',
    '{n} apps': '{n} apps',
    'Panel colour': 'Cor do painel',
    'Panel opacity': 'Opacidade do painel',
    'Lower is more see-through over live content; higher makes the panels easier to read.': 'Menor deixa mais transparente sobre o conteúdo ao vivo; maior deixa os painéis mais fáceis de ler.',
    'The channel was tuned, but the TV viewer could not open.': 'O canal foi sintonizado, mas o visualizador da TV não abriu.',
    'Channel {n} was not found.': 'O canal {n} não foi encontrado.',
    'Run a channel scan in the TV settings, then try again.': 'Faça uma busca de canais nas configurações da TV e tente de novo.',
    'Channels': 'Canais', 'Channel {n}': 'Canal {n}',
    'All channels': 'Todos os canais', 'Loading channels…': 'Carregando canais…',
    'No channels found. Run a channel scan in the TV settings.': 'Nenhum canal encontrado. Faça uma busca de canais nas configurações da TV.',
    'OK adds or removes the channel from the column.': 'OK adiciona ou remove o canal da coluna.',
    '{n} channels': '{n} canais', 'Edit saved channels': 'Editar canais salvos',
    'Saved': 'Salvo', 'Save': 'Salvar',
    'The column is full. Remove a channel first.': 'A coluna está cheia. Remova um canal primeiro.',
    '{name} removed from the column.': '{name} removido da coluna.', '{name} added to the column.': '{name} adicionado à coluna.',
    // Templates use {name}/{n}; the layer substitutes after lookup.
    '{name} stays installed.': '{name} continua instalado.',
    '{name} is in Recently removed. OK puts it back.': '{name} está em Removidos recentemente. OK devolve.',
    '{name} is on Home, position {n}.': '{name} está na Home, posição {n}.',
    '{name} moved to position {n}.': '{name} movido para a posição {n}.',
    'Moving {name}. OK places it, Back puts it back.': 'Movendo {name}. OK posiciona, Voltar devolve.',
    'On Home {n} of {cap}': 'Na Home {n} de {cap}',
    'Undo {label}': 'Desfazer {label}', 'Undone: {label}.': 'Desfeito: {label}.',
    'Remove {name}': 'Remover {name}', 'Add {name}': 'Adicionar {name}', 'Move {name}': 'Mover {name}'
  };

  var MAPS = { pt: PT }, lang = detect(), map = MAPS[lang] || null;
  try { document.documentElement.lang = lang; } catch (e) { /* non-fatal */ }

  function t(s, params) {
    var out = map && Object.prototype.hasOwnProperty.call(map, s) ? map[s] : s;
    if (params) for (var k in params) if (Object.prototype.hasOwnProperty.call(params, k)) out = out.split('{' + k + '}').join(params[k]);
    return out;
  }
  window.FrameI18n = { lang: lang, t: t };
}());
