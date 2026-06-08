import { cn } from '@documenso/ui/lib/utils';
import { Button } from '@documenso/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@documenso/ui/primitives/dialog';
import { ScrollArea } from '@documenso/ui/primitives/scroll-area';
import { Trans } from '@lingui/react/macro';
import { type HTMLAttributes, useState } from 'react';

export type DocumentSigningDisclosureProps = HTMLAttributes<HTMLParagraphElement>;

const SIGNATURE_CONSENT_TEXT = `Termo de Ciência e Consentimento para Uso de Assinatura Eletrônica
Bem-vindo
Obrigado por utilizar o BchatSign para realizar a assinatura eletrônica de documentos.
Este termo tem por finalidade informar você sobre o processo de assinatura eletrônica, sua validade jurídica, os métodos de autenticação utilizados, o tratamento de dados pessoais e seus direitos relacionados ao uso da plataforma.
Ao prosseguir com a assinatura eletrônica de um documento pelo BchatSign, você declara que leu, compreendeu e concorda com as condições descritas neste termo.
1. Aceitação e consentimento
Ao utilizar a plataforma para assinar eletronicamente documentos, você concorda em realizar o ato de assinatura por meio eletrônico, nos termos da legislação brasileira aplicável, incluindo a Lei nº 14.063/2020, a MP nº 2.200-2/2001, o Código Civil Brasileiro e a Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais — LGPD.
Você reconhece que a assinatura eletrônica realizada na plataforma poderá ser utilizada para demonstrar sua manifestação de vontade, aceite, concordância, ciência ou aprovação em relação ao conteúdo do documento assinado.
2. Modalidades de assinatura eletrônica disponíveis
O BchatSign poderá disponibilizar diferentes modalidades de assinatura eletrônica, conforme o tipo de documento, a configuração escolhida pelo remetente e os requisitos legais aplicáveis.
2.1. Assinatura eletrônica avançada
A assinatura eletrônica avançada é realizada por meio de mecanismos que permitem identificar o signatário e vincular sua manifestação ao documento eletrônico assinado.
Esse processo poderá incluir, entre outros elementos:
identificação do signatário;
confirmação por token enviado por e-mail, SMS ou WhatsApp;
registro de data e hora da assinatura;
registro de endereço IP;
geolocalização, quando disponível e autorizada;
geração e armazenamento do hash criptográfico do documento;
registro de eventos em trilha de auditoria;
vinculação do signatário ao documento assinado.
Essa modalidade busca atender aos critérios de autoria, integridade e vinculação ao documento, conforme previsto na legislação brasileira aplicável.
2.2. Assinatura eletrônica qualificada ICP-Brasil
A assinatura eletrônica qualificada é realizada mediante o uso de certificado digital emitido no âmbito da Infraestrutura de Chaves Públicas Brasileira — ICP-Brasil, como certificados A1 ou A3.
Essa modalidade é utilizada quando o documento, o remetente, as partes envolvidas ou a legislação aplicável exigirem assinatura qualificada com certificado digital ICP-Brasil.
3. Validade jurídica da assinatura eletrônica
Você reconhece que a assinatura eletrônica realizada por meio da plataforma poderá produzir efeitos jurídicos e ser utilizada como meio de comprovação de autoria, integridade e manifestação de vontade.
Nos termos da MP nº 2.200-2/2001, documentos eletrônicos podem ser considerados válidos para fins legais, e a legislação brasileira admite o uso de meios eletrônicos para comprovação de autoria e integridade, inclusive mediante métodos diversos da ICP-Brasil, quando aceitos pelas partes ou pela pessoa a quem o documento for apresentado.
A assinatura eletrônica qualificada, quando realizada com certificado digital ICP-Brasil, possui regime jurídico próprio e presunção de validade nos termos da legislação aplicável.
4. Consentimento para uso de meios eletrônicos
Ao prosseguir, você concorda em:
assinar documentos por meio eletrônico;
receber comunicações, notificações e documentos em formato eletrônico;
utilizar mecanismos de autenticação eletrônica, como token por e-mail, SMS ou WhatsApp;
ter os eventos relacionados ao processo de assinatura registrados em trilha de auditoria;
receber ou acessar a via final do documento assinado em formato eletrônico.
Você declara que possui acesso aos meios técnicos necessários para visualizar, baixar, armazenar ou imprimir os documentos eletrônicos assinados.
5. Requisitos técnicos mínimos
Para utilizar o serviço de assinatura eletrônica, você deve possuir:
acesso à internet;
conta de e-mail válida;
número de telefone válido, quando houver autenticação por SMS ou WhatsApp;
dispositivo capaz de acessar, visualizar e baixar documentos eletrônicos;
navegador atualizado ou aplicativo compatível;
meio para armazenar, imprimir ou encaminhar os documentos assinados, se desejar.
É sua responsabilidade manter seus dados de contato atualizados e garantir que consegue acessar os canais utilizados para autenticação e comunicação.
6. Autenticação, evidências e trilha de auditoria
Durante o processo de assinatura, a plataforma poderá registrar evidências técnicas relacionadas ao ato de assinatura, incluindo:
nome e dados de identificação informados;
endereço de e-mail;
número de telefone, quando aplicável;
data e hora dos eventos;
endereço IP;
geolocalização aproximada ou informada, quando disponível;
método de autenticação utilizado;
status de envio, recebimento e validação de tokens;
hash criptográfico do documento;
ID da assinatura;
histórico de visualização, aceite e assinatura;
demais eventos necessários para comprovar autoria, integridade e rastreabilidade do documento.
Essas evidências poderão compor o certificado de assinatura, a página de auditoria ou os registros internos da plataforma.
7. Tratamento de dados pessoais e LGPD
Para viabilizar a assinatura eletrônica, o BchatSign poderá tratar dados pessoais necessários à identificação do signatário, autenticação, registro de evidências, prevenção a fraudes, segurança da informação, cumprimento de obrigações legais e exercício regular de direitos.
O tratamento de dados pessoais será realizado conforme a Lei nº 13.709/2018 — LGPD, observando princípios como finalidade, adequação, necessidade, segurança, transparência e prevenção. A LGPD dispõe sobre o tratamento de dados pessoais em meios digitais e exige a adoção de medidas técnicas e administrativas aptas a proteger esses dados.
Ao prosseguir, você declara estar ciente de que determinados dados técnicos e cadastrais poderão ser coletados e armazenados para fins de comprovação da assinatura, segurança jurídica, auditoria, prevenção a fraudes e cumprimento de obrigações legais ou contratuais.
8. Entrega eletrônica de documentos
Os documentos relacionados ao processo de assinatura eletrônica poderão ser disponibilizados por meio da plataforma, por e-mail, link eletrônico, WhatsApp ou outro canal informado pelo remetente.
É sua responsabilidade garantir que os dados de contato informados estejam corretos e que você consiga acessar, abrir e armazenar os documentos recebidos.
9. Retirada de consentimento
Você poderá desistir de assinar eletronicamente antes da conclusão do processo de assinatura.
Para retirar seu consentimento antes da assinatura, entre em contato com o remetente do documento ou utilize os meios disponibilizados pela plataforma, quando existentes.
A retirada do consentimento poderá impedir, atrasar ou interromper a conclusão da transação, contrato, solicitação ou serviço relacionado ao documento.
Após a conclusão da assinatura, eventual cancelamento, revogação, substituição ou invalidação do documento dependerá das regras do próprio documento assinado, da legislação aplicável e da concordância das partes envolvidas, quando necessária.
10. Atualização das informações
Você se compromete a fornecer informações verdadeiras, completas e atualizadas durante o processo de assinatura.
Caso seus dados de contato estejam incorretos ou desatualizados, a entrega de notificações, tokens de autenticação e documentos poderá ser prejudicada.
11. Retenção e acesso aos documentos
Após a assinatura, você poderá visualizar, baixar e armazenar uma cópia do documento assinado eletronicamente, conforme as funcionalidades disponibilizadas pela plataforma ou pelo remetente.
Recomenda-se que você mantenha uma cópia do documento assinado e de eventuais comprovantes relacionados.
A plataforma e/ou o remetente poderão manter cópia do documento assinado, da trilha de auditoria e das evidências relacionadas pelo prazo necessário ao cumprimento de obrigações legais, contratuais, regulatórias, exercício regular de direitos, prevenção a fraudes e segurança jurídica.
12. Responsabilidade sobre o conteúdo do documento
O BchatSign fornece tecnologia para viabilizar o processo de assinatura eletrônica.
O conteúdo do documento, as obrigações nele previstas, os dados inseridos, as partes envolvidas e a finalidade da assinatura são de responsabilidade do remetente do documento e dos respectivos signatários, salvo disposição contratual específica em sentido diverso.
Antes de assinar, leia atentamente todo o documento. Ao concluir a assinatura, você declara que teve acesso ao conteúdo, compreendeu seus termos e manifestou sua concordância de forma livre e consciente.
13. Reconhecimento
Ao prosseguir com o uso do serviço de assinatura eletrônica do BchatSign, você declara que:
leu e compreendeu este termo;
aceita utilizar meios eletrônicos para assinar documentos;
reconhece que sua assinatura eletrônica poderá produzir efeitos jurídicos;
concorda com o registro de evidências técnicas relacionadas ao ato de assinatura;
autoriza o tratamento dos dados necessários ao processo de assinatura, nos termos da legislação aplicável;
declara que as informações fornecidas são verdadeiras e atualizadas;
compreende que a assinatura eletrônica poderá ser utilizada como prova de autoria, integridade e manifestação de vontade.
14. Informações de contato
Em caso de dúvidas sobre este termo, sobre o processo de assinatura eletrônica ou sobre o tratamento de dados pessoais, entre em contato com:
E-mail: contato@bolt360.com.br
Empresa responsável: WEBCK COMERCIO E SERVICOS DE TECNOLOGIA LTDA
CNPJ: 21.453.885/0001-54`;

export const DocumentSigningDisclosure = ({ className, ...props }: DocumentSigningDisclosureProps) => {
  const [open, setOpen] = useState(false);

  return (
    <p className={cn('text-muted-foreground text-xs', className)} {...props}>
      <Trans>
        Ao prosseguir com sua assinatura eletrônica, você reconhece e concorda que ela será utilizada para assinar o
        documento apresentado e terá validade jurídica equivalente à assinatura manuscrita. Ao concluir o processo de
        assinatura eletrônica, você confirma sua ciência e aceitação dessas condições.
      </Trans>
      <span className="mt-2 block">
        <Trans>Leia o </Trans>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="link"
              className="h-auto px-0 text-documenso-700 underline underline-offset-2"
            >
              <Trans>Termo de Ciência e Consentimento para Uso de Assinatura Eletrônica</Trans>
            </Button>
          </DialogTrigger>

          <DialogContent position="center" className="max-h-[90vh] sm:max-w-[60rem]">
            <DialogHeader>
              <DialogTitle>
                <Trans>Termo de Ciência e Consentimento para Uso de Assinatura Eletrônica</Trans>
              </DialogTitle>
              <DialogDescription>
                <Trans>Leia o termo completo antes de concluir a assinatura.</Trans>
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[60vh] rounded-md border p-4">
              <pre className="whitespace-pre-wrap font-sans text-foreground text-sm leading-6">
                {SIGNATURE_CONSENT_TEXT}
              </pre>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </span>
    </p>
  );
};
