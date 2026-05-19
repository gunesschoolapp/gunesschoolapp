import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, Mail, Plus, Check, Eye 
} from 'lucide-react';

const INTEGRATION_CATEGORIES = {
  messengers: {
    label: 'Mesaj Platformları',
    icon: MessageCircle,
    integrations: [
      {
        id: 'whatsapp',
        name: 'WhatsApp Business',
        icon: '💬',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        description: 'İntegrative mesaj, hedefli haberler, gelişmiş analitik',
        status: 'Installed',
        installed: true
      },
      {
        id: 'tiktok',
        name: 'TikTok',
        icon: '🎵',
        bgColor: 'bg-gray-900',
        textColor: 'text-white',
        description: 'Sosyal medya pazarlaması ve gelişim takibi',
        status: 'Yükle',
        installed: false
      },
      {
        id: 'instagram',
        name: 'Instagram',
        icon: '📷',
        bgColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
        textColor: 'text-white',
        description: 'Sosyal medya pazarlaması ve müşteri yönetimi',
        status: 'Yükle',
        installed: false
      },
      {
        id: 'messenger',
        name: 'Facebook Messenger',
        icon: '👥',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        description: 'Müşteri iletişimi ve lead yönetimi',
        status: 'Yükle',
        installed: false
      },
      {
        id: 'viber',
        name: 'Viber',
        icon: '📞',
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-700',
        description: 'Mobil mesajlaşma platformu',
        status: 'Yükle',
        installed: false
      },
      {
        id: 'skype',
        name: 'Skype',
        icon: '🎯',
        bgColor: 'bg-cyan-50',
        textColor: 'text-cyan-700',
        description: 'Video ve ses aramaları',
        status: 'Yükle',
        installed: false
      },
      {
        id: 'telegram',
        name: 'Telegram',
        icon: '✈️',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-600',
        description: 'Hızlı ve güvenli mesajlaşma',
        status: 'Yükle',
        installed: false
      },
      {
        id: 'wechat',
        name: 'WeChat',
        icon: '🗨️',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        description: 'Sosyal ağ ve ödeme platformu',
        status: 'Yükle',
        installed: false
      }
    ]
  },
  email: {
    label: 'E-posta Hizmetleri',
    icon: Mail,
    integrations: [
      {
        id: 'gmail',
        name: 'Gmail',
        icon: '📧',
        bgColor: 'bg-red-50',
        textColor: 'text-red-600',
        description: 'Google Mail entegrasyonu',
        status: 'Yükle',
        installed: false
      },
      {
        id: 'outlook',
        name: 'Outlook',
        icon: '📬',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-600',
        description: 'Microsoft Outlook e-postası',
        status: 'Yükle',
        installed: false
      }
    ]
  }
};

const IntegrationCard = ({ integration, onInstall }) => {
  const [isInstalling, setIsInstalling] = React.useState(false);

  const handleClick = async () => {
    if (!integration.installed) {
      setIsInstalling(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsInstalling(false);
      onInstall?.(integration);
    }
  };

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md ${integration.bgColor}`}>
      <CardContent className="p-4 h-32 flex flex-col items-center justify-between">
        <div className="text-4xl">{integration.icon}</div>
        <div className="text-center">
          <h3 className={`font-semibold text-sm ${integration.textColor}`}>
            {integration.name}
          </h3>
          <p className={`text-xs mt-1 opacity-75 ${integration.textColor}`}>
            {integration.description}
          </p>
        </div>
        <Button
          size="sm"
          variant={integration.installed ? 'outline' : 'default'}
          onClick={handleClick}
          disabled={isInstalling}
          className="mt-2 gap-1"
        >
          {integration.installed ? (
            <>
              <Check className="w-3 h-3" />
              Yüklü
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" />
              {isInstalling ? 'Yükleniyor...' : 'Yükle'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default function IntegrationShowcase() {
  const [searchTab, setSearchTab] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('relevance');

  const handleInstall = (integration) => {
    console.log('Installing:', integration.id);
  };

  // Flatten all integrations for "All" tab
  const allIntegrations = Object.values(INTEGRATION_CATEGORIES).flatMap(cat => cat.integrations);
  const installedIntegrations = allIntegrations.filter(i => i.installed);
  
  const getDisplayIntegrations = () => {
    switch (searchTab) {
      case 'all':
        return allIntegrations;
      case 'installed':
        return installedIntegrations;
      case 'messengers':
        return INTEGRATION_CATEGORIES.messengers.integrations;
      case 'email':
        return INTEGRATION_CATEGORIES.email.integrations;
      default:
        return allIntegrations;
    }
  };

  const displayIntegrations = getDisplayIntegrations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Entegrasyonlar</h2>
          <p className="text-sm text-muted-foreground mt-1">
            CRM'yi üçüncü taraf hizmetlerle bağlayın
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye className="w-4 h-4" />
          Web Hooks
        </Button>
      </div>

      <Tabs defaultValue="all" value={searchTab} onValueChange={setSearchTab}>
        <TabsList>
          <TabsTrigger value="all">Hepsi</TabsTrigger>
          <TabsTrigger value="installed" className="gap-1">
            Yüklü
            <Badge variant="outline" className="text-xs">
              {installedIntegrations.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="messengers">Mesaj Platformları</TabsTrigger>
          <TabsTrigger value="email">E-posta</TabsTrigger>
        </TabsList>

        <TabsContent value={searchTab} className="mt-6">
          {displayIntegrations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Entegrasyon bulunamadı</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayIntegrations.map(integration => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onInstall={handleInstall}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Kategoriler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(INTEGRATION_CATEGORIES).map(([key, category]) => {
          const Icon = category.icon;
          const installed = category.integrations.filter(i => i.installed).length;
          const total = category.integrations.length;

          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className="w-5 h-5 text-primary" />
                  {category.label}
                  <Badge variant="outline" className="ml-auto">
                    {installed}/{total}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {category.integrations.map(integration => (
                    <div key={integration.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <span className="text-sm">{integration.name}</span>
                      {integration.installed && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}