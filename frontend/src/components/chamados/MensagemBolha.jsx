export default function MensagemBolha({ mensagem }) {
  const isCliente = mensagem.de === 'client'
  return (
    <div className={`flex ${isCliente ? 'justify-start' : 'justify-end'} mb-3`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isCliente
            ? 'bg-gray-100 text-gray-900'
            : 'bg-indigo-600 text-white'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{mensagem.texto}</p>
        {mensagem.hora && (
          <p className={`text-xs mt-1 ${isCliente ? 'text-gray-400' : 'text-indigo-200'}`}>
            {mensagem.hora}
          </p>
        )}
      </div>
    </div>
  )
}
