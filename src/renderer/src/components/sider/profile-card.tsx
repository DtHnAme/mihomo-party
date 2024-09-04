import { Button, Card, CardBody, CardFooter, Chip, Progress } from '@nextui-org/react'
import { useProfileConfig } from '@renderer/hooks/use-profile-config'
import { useLocation } from 'react-router-dom'
import { calcTraffic, calcPercent } from '@renderer/utils/calc'
import { CgLoadbarDoc } from 'react-icons/cg'
import { IoMdRefresh, IoMdSwap } from 'react-icons/io'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import 'dayjs/locale/zh-cn'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import ConfigViewer from './config-viewer'
import useSWR from 'swr'
import { mihomoProxyProviders, mihomoUpdateProxyProviders } from '@renderer/utils/ipc'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const ProfileCard: React.FC = () => {
  const { data, mutate } = useSWR('mihomoProxyProviders', mihomoProxyProviders)
  const providers = useMemo(() => {
    if (!data) return []
    if (!data.providers) return []
    return Object.keys(data.providers)
      .map((key) => data.providers[key])
      .filter((provider) => {
        return 'subscriptionInfo' in provider
      })
  }, [data])
  const location = useLocation()
  const match = location.pathname.includes('/profiles')
  const [updating, setUpdating] = useState(false)
  const [count, setCount] = useState(0)
  const [showRuntimeConfig, setShowRuntimeConfig] = useState(false)
  const { profileConfig, addProfileItem } = useProfileConfig()
  const { current, items } = profileConfig ?? {}
  const subscriptionInfo = providers.length ? {
    upload: providers[count].subscriptionInfo?.Upload,
    download: providers[count].subscriptionInfo?.Download,
    total: providers[count].subscriptionInfo?.Total,
    expire: providers[count].subscriptionInfo?.Expire,
  } : null
  const {
    attributes,
    listeners,
    setNodeRef,
    transform: tf,
    transition,
    isDragging
  } = useSortable({
    id: 'profile'
  })
  const transform = tf ? { x: tf.x, y: tf.y, scaleX: 1, scaleY: 1 } : null
  const info = items?.find((item) => item.id === current) ?? {
    id: 'default',
    type: 'local',
    name: '空白订阅'
  }

  const extra = info?.extra ?? subscriptionInfo

  const usage = (extra?.upload ?? 0) + (extra?.download ?? 0)
  const total = extra?.total ?? 0

  useEffect(() => {
    window.electron.ipcRenderer.on('coreRestart', () => {
      setTimeout(() => {
        mutate()
      }, 2000)
    })
    return (): void => {
      window.electron.ipcRenderer.removeAllListeners('coreRestart')
    }
  }, [])

  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners}
      style={{
        position: 'relative',
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 'calc(infinity)' : undefined
      }}
      className="col-span-2"
    >
      {showRuntimeConfig && <ConfigViewer onClose={() => setShowRuntimeConfig(false)} />}
      <Card
        fullWidth
        className={`${match ? 'bg-primary' : 'hover:bg-primary/30'} ${isDragging ? 'scale-[0.97] tap-highlight-transparent' : ''}`}
      >
        <CardBody className="pb-1">
          <div
            className="flex justify-between h-[32px]"
          >
            <h3
              title={info?.name}
              className={`text-ellipsis whitespace-nowrap overflow-hidden text-md font-bold leading-[32px] ${match ? 'text-white' : 'text-foreground'} `}
            >
              {info?.name}
            </h3>
            <div className="flex">
              {providers.length > 1 && subscriptionInfo && (
                <Button
                  isIconOnly
                  size="sm"
                  title={providers[count].name}
                  variant="light"
                  color="default"
                  onPress={() => {
                    if (count < providers.length - 1) {
                      setCount(count + 1)
                    } else {
                      setCount(0)
                    }
                    mutate()
                  }}
                >
                  <IoMdSwap
                    className={`text-[24px] ${match ? 'text-white' : 'text-foreground'}`}
                  />
                </Button>
              )}
              <Button
                isIconOnly
                size="sm"
                title="查看当前运行时配置"
                variant="light"
                color="default"
                onPress={() => {
                  setShowRuntimeConfig(true)
                }}
              >
                <CgLoadbarDoc
                  className={`text-[24px] ${match ? 'text-white' : 'text-foreground'}`}
                />
              </Button>
              {extra && (
                <Button
                  isIconOnly
                  size="sm"
                  title={dayjs(subscriptionInfo ? providers[count].updatedAt : info.updated).fromNow()}
                  disabled={updating}
                  variant="light"
                  color="default"
                  onPress={async () => {
                    setUpdating(true)
                    if (subscriptionInfo) {
                      try {
                        await mihomoUpdateProxyProviders(providers[count].name)
                      } finally {
                        mutate()
                      }
                    } else {
                      await addProfileItem(info)
                    }
                    setUpdating(false)
                  }}
                >
                  <IoMdRefresh
                    className={`text-[24px] ${match ? 'text-white' : 'text-foreground'} ${updating ? 'animate-spin' : ''}`}
                  />
                </Button>
              )}
            </div>
          </div>
          {extra && (
            <div
              className={`mt-2 flex justify-between ${match ? 'text-white' : 'text-foreground'} `}
            >
              <small>{`${calcTraffic(usage)}/${calcTraffic(total)}`}</small>
              <small>
                {extra.expire ? dayjs.unix(extra.expire).format('YYYY-MM-DD') : '长期有效'}
              </small>
            </div>
          )}
          {info.type === 'local' && !extra && (
            <div
              className={`mt-2 flex justify-between ${match ? 'text-white' : 'text-foreground'}`}
            >
              <Chip
                size="sm"
                variant="bordered"
                className={`${match ? 'text-white border-white' : 'border-primary text-primary'}`}
              >
                本地
              </Chip>
            </div>
          )}
        </CardBody>
        <CardFooter className="pt-0">
          {extra && (
            <Progress
              className="w-full"
              classNames={{ indicator: match ? 'bg-white' : 'bg-foreground' }}
              value={calcPercent(extra?.upload, extra?.download, extra?.total)}
            />
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

export default ProfileCard
