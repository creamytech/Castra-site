"use client"

import Button from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Chip } from "@/components/ui/Chip"
import { Tabs } from "@/components/ui/Tabs"
import { DataList } from "@/components/ui/DataList"
import EmptyState from "@/components/ui/EmptyState"
import Modal from "@/components/ui/Modal"
import Sheet from "@/components/ui/Sheet"
import { useState } from "react"

export default function UIShowcase() {
  const [tab, setTab] = useState("a")
  const [openModal, setOpenModal] = useState(false)
  const [openSheet, setOpenSheet] = useState(false)
  const items = new Array(200).fill(0).map((_, i) => ({ id: i, name: `Item ${i}` }))

  return (
    <div className="space-y-8">
      <section className="card">
        <h2 className="h2 mb-4">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button loading>Loading</Button>
        </div>
      </section>

      <section className="card">
        <h2 className="h2 mb-4">Badges & Chips</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Badge status="lead">Lead</Badge>
          <Badge status="potential">Potential</Badge>
          <Badge status="no_lead">No Lead</Badge>
          <Badge status="vendor">Vendor</Badge>
          <Badge status="newsletter">Newsletter</Badge>
          <Badge status="follow_up">Follow Up</Badge>
          <Chip>Chip</Chip>
          <Chip selected>Selected</Chip>
        </div>
      </section>

      <section className="card">
        <h2 className="h2 mb-4">Tabs</h2>
        <Tabs value={tab} onValueChange={setTab} tabs={[{ value: "a", label: "A", counter: 2 }, { value: "b", label: "B" }]} />
      </section>

      <section className="card">
        <h2 className="h2 mb-4">DataList (virtualized)</h2>
        <div className="h-64">
          <DataList
            items={items}
            itemKey={(i) => i.id}
            itemHeight={36}
            height={240}
            renderRow={(i) => <div className="row">{i.name}</div>}
          />
        </div>
      </section>

      <section className="card">
        <h2 className="h2 mb-4">Empty & Error</h2>
        <EmptyState title="No data" description="Try adjusting your filters" action={<Button>Create</Button>} />
      </section>

      <section className="card">
        <h2 className="h2 mb-4">Modal & Sheet</h2>
        <div className="flex gap-3">
          <Button onClick={() => setOpenModal(true)}>Open Modal</Button>
          <Button variant="secondary" onClick={() => setOpenSheet(true)}>Open Sheet</Button>
        </div>
      </section>

      <Modal open={openModal} onOpenChange={setOpenModal} title="Example Modal" description="Use this for confirmations">
        <p>Content goes here</p>
      </Modal>
      <Sheet open={openSheet} onOpenChange={setOpenSheet}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="h3">Right Sheet</h3>
          <Button variant="ghost" onClick={() => setOpenSheet(false)}>Close</Button>
        </div>
        <p>Sheet content goes here</p>
      </Sheet>
    </div>
  )
}


