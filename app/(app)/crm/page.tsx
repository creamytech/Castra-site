"use client"

import PipelineBoard from '@/components/crm/PipelineBoard'

export default function CRMPage() {
  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <p className="text-sm text-muted-foreground">Manage your deals across stages.</p>
      </div>
      <PipelineBoard />
    </div>
  )
}
