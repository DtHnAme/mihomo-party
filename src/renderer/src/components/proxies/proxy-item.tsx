import { Button, Card, CardBody } from '@nextui-org/react'
import React, { useEffect, useMemo, useState } from 'react'
import PubSub from 'pubsub-js'

interface Props {
  mutateProxies: () => void
  onProxyDelay: (proxy: string, url?: string) => Promise<IMihomoDelay>
  proxy: IMihomoProxy | IMihomoGroup
  group: IMihomoMixedGroup
  onSelect: (group: string, proxy: string) => void
  selected: boolean
}

const ProxyItem: React.FC<Props> = (props) => {
  const { mutateProxies, group, proxy, selected, onSelect, onProxyDelay } = props

  const delay = useMemo(() => {
    if (proxy.history.length > 0) {
      return proxy.history[proxy.history.length - 1].delay
    }
    return -1
  }, [proxy])

  const [loading, setLoading] = useState(false)

  function delayColor(delay: number): 'primary' | 'success' | 'warning' | 'danger' {
    if (delay === -1) return 'primary'
    if (delay === 0) return 'danger'
    if (delay < 500) return 'success'
    return 'warning'
  }

  function delayText(delay: number): string {
    if (delay === -1) return 'Delay'
    if (delay === 0) return 'Timeout'
    return delay.toString()
  }

  const onDelay = (): void => {
    setLoading(true)
    onProxyDelay(proxy.name, group.testUrl).finally(() => {
      mutateProxies()
      setLoading(false)
    })
  }

  useEffect(() => {
    const token = PubSub.subscribe(`${group.name}-delay`, onDelay)

    return (): void => {
      PubSub.unsubscribe(token)
    }
  }, [])
  const fixed = group.fixed && group.fixed === proxy.name

  return (
    <Card
      onPress={() => onSelect(group.name, proxy.name)}
      isPressable
      fullWidth
      className={`${fixed ? 'bg-secondary/30' : selected ? 'bg-primary/30' : 'bg-content2'}`}
      radius="sm"
    >
      <CardBody className="p-2">
        <div className="flex justify-between items-center">
          <div className="text-ellipsis overflow-hidden whitespace-nowrap">
            <div className="flag-emoji inline" title={proxy.name}>
              {proxy.name}
            </div>
          </div>
          <Button
            title={proxy.type}
            isLoading={loading}
            color={delayColor(delay)}
            onPress={onDelay}
            variant="light"
            className="h-full min-w-[50px] p-0 mx-2 text-sm hover:bg-content"
          >
            {delayText(delay)}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

export default ProxyItem
