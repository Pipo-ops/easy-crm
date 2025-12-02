import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TruckRoutesComponent } from './truck-routes.component';

describe('TruckRoutesComponent', () => {
  let component: TruckRoutesComponent;
  let fixture: ComponentFixture<TruckRoutesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TruckRoutesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TruckRoutesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
