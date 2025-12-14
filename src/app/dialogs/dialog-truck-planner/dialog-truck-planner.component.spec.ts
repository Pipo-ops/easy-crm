import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogTruckPlannerComponent } from './dialog-truck-planner.component';

describe('DialogTruckPlannerComponent', () => {
  let component: DialogTruckPlannerComponent;
  let fixture: ComponentFixture<DialogTruckPlannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogTruckPlannerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogTruckPlannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
